"""
AI Signal Inference Engine - Extract structured signals from chat interactions.
Extracted from server.py.
"""
import os
import logging
import uuid
from typing import Optional
from datetime import datetime, timezone

from openai import AsyncOpenAI
from core.database import db

logger = logging.getLogger(__name__)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

async def infer_user_signals_from_chat(user_id: str, user_message: str, assistant_response: str, ai_action: Optional[str] = None):
    """
    Infer structured signals from a chat interaction using GPT-4o.
    NEVER stores raw chat text - only normalized tags with confidence scores.
    Runs as background task to not block chat responses.
    """
    if not OPENAI_API_KEY:
        return

    try:
        # Check if user has analytics consent
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "consent": 1})
        if not user_doc or not user_doc.get("consent", {}).get("analytics_consent"):
            return  # User hasn't consented to analytics
        
        # Get current insights for this user
        current_insights = await db.user_inferred_insights.find_one({"user_id": user_id}, {"_id": 0})
        
        # Build prompt for GPT-4o inference
        inference_prompt = f"""Analyze this shopping assistant conversation and extract structured signals.
DO NOT include any raw text from the conversation in your response.
Return ONLY a JSON object with inferred tags.

Context of user/assistant exchange (for inference only, do not store):
USER: {user_message[:500]}
ASSISTANT: {assistant_response[:500]}

Extract these signals as normalized tags (use snake_case, English terms):

1. likes_tags: Products, ingredients, or categories the user shows interest in
   Examples: olive_oil, organic_products, spanish_ham, vegan_snacks

2. dislikes_tags: Products, ingredients the user wants to avoid (NOT allergies)
   Examples: palm_oil, artificial_sweeteners, processed_foods

3. diet_goal_tags: Health or dietary objectives mentioned
   Examples: weight_loss, heart_health, muscle_gain, clean_eating, low_sodium

4. budget_profile: Infer from context (low/medium/premium) or null if unclear

5. fear_tags: Health concerns or fears expressed (SENSITIVE - high threshold)
   Examples: sugar_concern, cholesterol_fear, diabetes_worry, ultra_processed_fear

6. allergy_tags: Allergies or intolerances mentioned (SENSITIVE)
   Examples: nut_allergy, gluten_intolerance, lactose_intolerance, shellfish_allergy

For each tag, assign a confidence score (0.0-1.0):
- 0.9+: Explicitly stated
- 0.7-0.8: Strongly implied
- 0.5-0.6: Weakly implied

Return ONLY valid JSON:
{{
  "likes_tags": [{{"tag": "example", "confidence": 0.8}}],
  "dislikes_tags": [],
  "diet_goal_tags": [],
  "budget_profile": null,
  "fear_tags": [],
  "allergy_tags": []
}}

If no signals detected, return empty arrays. Be conservative with sensitive signals (fears, allergies)."""

        # Call GPT-4o for inference
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        completion = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a signal extraction engine. Return only valid JSON. Never include raw user text in output."},
                {"role": "user", "content": inference_prompt},
            ],
        )
        response = completion.choices[0].message.content
        
        # Parse JSON response
        import json
        try:
            # Clean response - sometimes GPT adds markdown
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            inferred = json.loads(clean_response)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse inference response: {response[:200]}")
            return
        
        # Prepare update with timestamps
        now = datetime.now(timezone.utc).isoformat()
        
        def add_timestamps(tags):
            return [{"tag": t["tag"], "confidence": t["confidence"], "source": "ai_chat", "inferred_at": now} 
                    for t in tags if isinstance(t, dict) and "tag" in t]
        
        # Merge with existing insights (keep highest confidence for duplicates)
        def merge_tags(existing, new_tags):
            existing_dict = {t["tag"]: t for t in existing}
            for tag in new_tags:
                tag_name = tag["tag"]
                if tag_name in existing_dict:
                    # Keep higher confidence
                    if tag["confidence"] > existing_dict[tag_name].get("confidence", 0):
                        existing_dict[tag_name] = tag
                else:
                    existing_dict[tag_name] = tag
            return list(existing_dict.values())
        
        # Build update document
        update_data = {
            "user_id": user_id,
            "updated_at": now
        }
        
        if current_insights:
            # Merge with existing
            if inferred.get("likes_tags"):
                update_data["likes_tags"] = merge_tags(
                    current_insights.get("likes_tags", []),
                    add_timestamps(inferred["likes_tags"])
                )
            if inferred.get("dislikes_tags"):
                update_data["dislikes_tags"] = merge_tags(
                    current_insights.get("dislikes_tags", []),
                    add_timestamps(inferred["dislikes_tags"])
                )
            if inferred.get("diet_goal_tags"):
                update_data["diet_goal_tags"] = merge_tags(
                    current_insights.get("diet_goal_tags", []),
                    add_timestamps(inferred["diet_goal_tags"])
                )
            if inferred.get("fear_tags"):
                update_data["fear_tags"] = merge_tags(
                    current_insights.get("fear_tags", []),
                    add_timestamps(inferred["fear_tags"])
                )
            if inferred.get("allergy_tags"):
                update_data["allergy_tags"] = merge_tags(
                    current_insights.get("allergy_tags", []),
                    add_timestamps(inferred["allergy_tags"])
                )
            if inferred.get("budget_profile"):
                update_data["budget_profile"] = inferred["budget_profile"]
            
            # Increment interaction counter
            update_data["total_ai_interactions"] = current_insights.get("total_ai_interactions", 0) + 1
            update_data["last_inference_at"] = now
            
            # Track AI action usage
            if ai_action:
                ai_action_usage = current_insights.get("ai_action_usage", {})
                ai_action_usage[ai_action] = ai_action_usage.get(ai_action, 0) + 1
                update_data["ai_action_usage"] = ai_action_usage
        else:
            # Create new document
            update_data["likes_tags"] = add_timestamps(inferred.get("likes_tags", []))
            update_data["dislikes_tags"] = add_timestamps(inferred.get("dislikes_tags", []))
            update_data["diet_goal_tags"] = add_timestamps(inferred.get("diet_goal_tags", []))
            update_data["fear_tags"] = add_timestamps(inferred.get("fear_tags", []))
            update_data["allergy_tags"] = add_timestamps(inferred.get("allergy_tags", []))
            update_data["budget_profile"] = inferred.get("budget_profile")
            update_data["health_goal_tags"] = []
            update_data["ai_action_usage"] = {ai_action: 1} if ai_action else {}
            update_data["total_ai_interactions"] = 1
            update_data["last_inference_at"] = now
            update_data["created_at"] = now
        
        # Upsert to database
        await db.user_inferred_insights.update_one(
            {"user_id": user_id},
            {"$set": update_data},
            upsert=True
        )
        
        logger.info(f"Inferred signals for user {user_id}: likes={len(update_data.get('likes_tags', []))}, fears={len(update_data.get('fear_tags', []))}")
        
    except Exception as e:
        logger.error(f"Signal inference error for user {user_id}: {e}")


# Product/Commerce/Chat models imported from core.models
# Constants (SUPPORTED_COUNTRIES, etc.) imported from core.constants

# =============================================================================
# TRANSLATION SERVICE - Automatic Multilingual Content
# =============================================================================

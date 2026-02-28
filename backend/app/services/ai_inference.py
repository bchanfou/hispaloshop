"""
AI service: GPT-4o inference for user signal extraction.
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

from ..core.config import db, EMERGENT_LLM_KEY, logger


async def infer_user_signals_from_chat(
    user_id: str, 
    user_message: str, 
    assistant_response: str, 
    ai_action: Optional[str] = None
):
    """
    Infer structured signals from a chat interaction using GPT-4o.
    NEVER stores raw chat text - only normalized tags with confidence scores.
    Runs as background task to not block chat responses.
    """
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
        session_id = f"inference_{uuid.uuid4().hex[:8]}"
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="You are a signal extraction engine. Return only valid JSON. Never include raw user text in output."
        )
        chat.with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=inference_prompt))
        
        # Parse JSON response
        try:
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
        
        def merge_tags(existing, new_tags):
            existing_dict = {t["tag"]: t for t in existing}
            for tag in new_tags:
                tag_name = tag["tag"]
                if tag_name in existing_dict:
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
        else:
            # First insights for this user
            update_data["likes_tags"] = add_timestamps(inferred.get("likes_tags", []))
            update_data["dislikes_tags"] = add_timestamps(inferred.get("dislikes_tags", []))
            update_data["diet_goal_tags"] = add_timestamps(inferred.get("diet_goal_tags", []))
            update_data["fear_tags"] = add_timestamps(inferred.get("fear_tags", []))
            update_data["allergy_tags"] = add_timestamps(inferred.get("allergy_tags", []))
            if inferred.get("budget_profile"):
                update_data["budget_profile"] = inferred["budget_profile"]
        
        # Track AI action if provided
        if ai_action:
            action_key = f"ai_action_usage.{ai_action}"
            await db.user_inferred_insights.update_one(
                {"user_id": user_id},
                {"$inc": {action_key: 1, "total_ai_interactions": 1}},
                upsert=True
            )
        
        # Update or insert insights
        await db.user_inferred_insights.update_one(
            {"user_id": user_id},
            {"$set": update_data},
            upsert=True
        )
        
        logger.info(f"[INFERENCE] Updated insights for user {user_id}")
        
    except Exception as e:
        logger.error(f"[INFERENCE ERROR] {str(e)}")

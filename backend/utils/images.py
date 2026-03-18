"""Shared image extraction utility."""


def extract_product_image(product: dict, fallback=None) -> str | None:
    """Safely extract the first image URL from a product, handling both dict and string formats.

    Products may store images as:
    - images: ["https://..."]  (string list)
    - images: [{"url": "https://..."}]  (dict list)
    - image_url: "https://..."  (flat field)
    """
    if not product:
        return fallback
    images = product.get("images")
    if images and isinstance(images, list) and len(images) > 0:
        first = images[0]
        if isinstance(first, dict):
            return first.get("url") or fallback
        if isinstance(first, str):
            return first
    return product.get("image_url") or product.get("image") or fallback

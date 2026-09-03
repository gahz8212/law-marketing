import json
import os
import time
from app.core.curated_cases import CURATED_THEMES
from app.api.endpoints import get_theme_detail

cache_file = "static/data/prebuilt_themes_cache.json"
cached_data = {}

for idx, t in enumerate(CURATED_THEMES):
    theme_id = t["id"]
    cache_key = f"{theme_id}_ko"
    title = t["title"]
    print(f"[{idx+1}/{len(CURATED_THEMES)}] Pre-warming: {theme_id} ({title})...", flush=True)
    try:
        res = get_theme_detail(theme_id=theme_id, lang="ko", refresh=False)
        if hasattr(res, "model_dump"):
            cached_data[cache_key] = res.model_dump()
        else:
            cached_data[cache_key] = dict(res)
    except Exception as e:
        print(f"  Error on {theme_id}: {e}", flush=True)
    time.sleep(0.3)

with open(cache_file, "w", encoding="utf-8") as f:
    json.dump(cached_data, f, ensure_ascii=False, indent=2)

print(f"\n✅ Finished! Successfully prebuilt {len(cached_data)} theme assets into {cache_file}", flush=True)

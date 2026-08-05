# Resolved assets

| Role | Frozen project path | Source | Treatment | Decision |
| --- | --- | --- | --- | --- |
| battlefield | `.media/images/image_001.png` | `../../src/assets/backgrounds/チュートリアル/background.png` | none | use — exact 1920x1080 game background |
| player | `.media/images/image_002.png` | `../../src/assets/characters/battle/チュートリアル/プレイヤー/player.png` | none | use — exact transparent player art |
| enemy | `.media/images/image_003.png` | `../../src/assets/characters/battle/チュートリアル/敵/火喰らいの獣.png` | none | use — exact fire-eater enemy art |

All three files were ingested locally with `media-use`; no search, generation, or external download was used. The machine-readable provenance remains in `.media/manifest.jsonl`.

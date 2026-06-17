# Source Documents

Drop source PDF documents here.

**Required:** `dpdp_act.pdf` (DPDP Act 2023 — official gazette version)

After adding new documents, re-run the ingestion script from the `backend/` directory:

```
python scripts/ingest_dpdp.py
```

The script is safe to re-run — it upserts chunks and will not create duplicates.

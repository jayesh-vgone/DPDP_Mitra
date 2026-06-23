# Source Documents

Drop source PDF documents into the appropriate subfolder:

```
backend/docs/
  act/         ← DPDP Act and other statutes (statute chunker)
  case_law/    ← Court judgments and orders (case-law chunker)
```

**Required:** `act/DPDP.pdf` — Digital Personal Data Protection Act, 2023 (official gazette PDF)

**Optional:** Any `.pdf` files in `case_law/` — court judgments/orders that interpret the DPDP Act.

After adding new documents, re-run the ingestion script from the `backend/` directory:

```
python scripts/ingest_dpdp.py
```

The script is re-runnable and idempotent — chunks whose text is unchanged are not re-embedded
(Cohere API quota is preserved). New or updated chunks are embedded and upserted.

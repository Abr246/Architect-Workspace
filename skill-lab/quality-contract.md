# Quality Contract — Orders Dataset

Applies to: `skill-lab/orders.csv`

| Rule | Requirement |
|---|---|
| Key uniqueness | `order_id` must be unique — no duplicate values |
| Required field | `region` is required — no null/blank values |
| Numeric rule | `revenue` must be greater than zero |
| Freshness | `load_timestamp` must be less than 24 hours old |
| Expected volume | Row count must be at least 10 |

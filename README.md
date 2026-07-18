# AnthroReg

Anthropometric regression and stature estimation tool
Department of Anatomy, School of Basic Medical Sciences, FUTO
Designed & developed by **Sotech**

## Files in this repository

| File | Purpose |
|---|---|
| `index.html` | The entire website. All styles, photos, animations and calculations are inside this one file. |
| `api/records.js` | Serverless API. Stores saved equations in a shared database so everyone sees the same records. |
| `sample-data.csv` | Example file for testing the upload button. |

## Deploying

1. Push this repository to GitHub.
2. On vercel.com, import the repository. Framework preset: **Other**. No build command.
3. Deploy.
4. In the Vercel project, open the **Storage** tab and create a Redis / KV store, then connect it to the project.
5. Redeploy once so the database keys are picked up.

Without step 4 the site still works, but each visitor's saved records stay in their own browser.

## Environment variables

Created automatically when the store is connected. Any one of these pairs works:

- `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `REDIS_URL` + `REDIS_TOKEN`

## Upload file format

Either layout is accepted:

```
Hand Length 1, Hand Length 2, Stature 1, Stature 2
Hand Length, Stature
```

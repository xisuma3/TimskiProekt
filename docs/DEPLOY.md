# Deploying to Azure for $0

| Part | Azure service | Free allowance |
|---|---|---|
| Database | Azure SQL Database, **free offer** (serverless) | 100,000 vCore-seconds + 32 GB per month, auto-pauses when idle |
| API | App Service, **Free F1**, Linux, .NET 10 | 60 CPU-minutes/day, 1 GB RAM, sleeps when idle |
| Frontend | Static Web Apps, **Free** | HTTPS, SPA routing via `public/staticwebapp.config.json` |
| Pipeline | GitHub Actions (`.github/workflows/deploy.yml`) | unlimited on a public repo |

Account: **Azure for Students**, which needs no credit card, so nothing can bill by surprise.

How a release flows: push or merge to `main` → **CI** passes → **Deploy** publishes the API,
waits until it answers, then builds the frontend with the API URL baked in and uploads it.
On boot the API applies any pending migrations itself (`Database__MigrateOnStartup`).

> **Cold start.** After ~20 idle minutes the API sleeps, and after an idle hour the database
> pauses. The first request after that can take about a minute. **Open the site a few
> minutes before a demo or grading session.**

---

## 1. One-time Azure setup (portal)

Use **one resource group and one region** for everything (e.g. West Europe). Azure for
Students limits which regions you may use; if a create fails with a policy/region error,
pick one of the regions the error lists.

### 1.1 Database

1. Create **SQL database**. On the Basics tab, accept the **"Apply offer"** banner for the free
   Azure SQL Database offer.
2. **Server → Create new**. Authentication: **Use SQL authentication**. Pick an admin login
   and a strong password, and keep them in your password manager.
3. **Behavior when free limit reached: Auto-pause the database until next month**. Never
   choose the "continue using for additional charges" option.
4. Networking: Public endpoint. Turn on **Allow Azure services and resources to access this
   server** (that's how the API gets in) and **Add current client IP address** (that's how
   you load the demo data).
5. Once created: database → **Connection strings** → **ADO.NET (SQL authentication)**. Copy
   it and replace `{your_password}`. This is `ConnectionStrings__DefaultConnection` below.

### 1.2 API (Web App)

1. Create **Web App**: Publish **Code**, Runtime stack **.NET 10 (LTS)**, OS **Linux**,
   same region, pricing plan **Free F1**.
2. Note the **Default domain** on the Overview page. New apps get a unique one like
   `hrapp-abc123.westeurope-01.azurewebsites.net`, so copy it rather than guessing.
   `https://` + that is your **API URL**.
3. **Settings → Configuration → General settings**: **SCM Basic Auth Publishing Credentials
   = On** (the publish profile needs it), **HTTPS Only = On**. Save.
4. **Settings → Environment variables → App settings**, add:

   | Name | Value |
   |---|---|
   | `ConnectionStrings__DefaultConnection` | the ADO.NET string from 1.1 |
   | `Database__MigrateOnStartup` | `true` |
   | `Jwt__Key` | a fresh random key, see below. **Never** the dev key from `appsettings.Development.json` |
   | `Jwt__Issuer` | the API URL |
   | `Jwt__Audience` | the API URL |
   | `Cors__AllowedOrigins__0` | the frontend URL from 1.3 (add it once that exists) |
   | `BootstrapAdmin__Email` | the first admin's login, e.g. your own email |
   | `BootstrapAdmin__Password` | that admin's password (6+ characters; make it strong) |

   Generate the key in PowerShell:

   ```powershell
   $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString('x2') })
   ```

5. Overview → **Download publish profile**. You'll paste the whole XML into GitHub.

### 1.3 Frontend (Static Web App)

1. Create **Static Web App**: plan **Free**, deployment source **Other**.
2. Overview: copy the **URL** (`https://<name>.azurestaticapps.net`) into the Web App's
   `Cors__AllowedOrigins__0` setting from 1.2.
3. **Manage deployment token** → copy it.

## 2. GitHub setup

Repo → **Settings → Secrets and variables → Actions** (needs admin rights on the repo):

| Kind | Name | Value |
|---|---|---|
| Secret | `AZUREAPPSERVICE_PUBLISHPROFILE` | the publish profile XML from 1.2 |
| Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | the deployment token from 1.3 |
| Variable | `AZURE_WEBAPP_NAME` | the Web App's name |
| Variable | `API_URL` | the API URL from 1.2, with `https://` |

Until both variables exist, the Deploy workflow skips instead of failing.

## 3. First deploy

1. Get the code onto `main` (merge the PR). CI runs, then **Deploy** runs. Once
   `deploy.yml` is on `main` you can also start it from **Actions → Deploy → Run workflow**.
2. The **Wait for the API to come up** step passes once the API answers. By then it has
   created every table and the bootstrap admin. If it fails, open the Web App's **Log
   stream**: a wrong connection string, a missing `Jwt__Key` or a bad bootstrap setting all
   show up there.
3. Open the frontend URL and log in as the bootstrap admin.
4. Optional: delete the `BootstrapAdmin__Password` setting. It only acts while **no** admin
   exists, so it will never reset a password or create a second admin. The account keeps
   the password it was created with.

## 4. Load the demo data

Run this **after** the first deploy, because the scripts need the tables. Run it from the
repo root on a machine whose IP you allowed in 1.1. `sqlcmd` asks for the SQL admin password:

```powershell
sqlcmd -S tcp:<server>.database.windows.net,1433 -d <database> -U <sql-admin-login> -N -b -i db\seed-dummy-data.sql
sqlcmd -S tcp:<server>.database.windows.net,1433 -d <database> -U <sql-admin-login> -N -b -i db\seed-document-templates.sql
```

No `sqlcmd`? Paste each file into the database's **Query editor** in the portal and run it.
Both scripts are idempotent, so running them twice adds nothing.

That gives you 7 departments, 19 employees with dossiers and 2026 leave allowances, 16 leave
requests, 12 assets and 7 document templates. Demo employees have **no logins**. To show
the employee side, register an account from the admin UI.

## 5. Running it

- **Leave allowances are per year.** The seed creates 2026 rows only, and a request with no
  allowance is refused. In January, run **Carry over** from 2026 on the *Leave allowances*
  page, which also creates the 2027 allowances.
- **Don't point an uptime monitor at the API.** Keeping the database awake burns the
  monthly allowance, and once it's gone the database pauses until next month.
- Rotating `Jwt__Key` logs everyone out. Nothing else breaks.
- Swagger is off in Production on purpose. Use it locally.
- If you outgrow F1 (60 CPU-minutes/day), the Basic B1 plan can be paid from the student
  credit. Only the plan changes; nothing in the repo does.

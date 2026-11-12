# Deploying to Azure for $0

| Part | Azure service | Free allowance |
|---|---|---|
| Database | Azure SQL Database, **free offer** (serverless) | 100,000 vCore-seconds + 32 GB per month, auto-pauses when idle |
| API **and** frontend | App Service, **Free F1**, Linux, .NET 10 | 60 CPU-minutes/day, 1 GB RAM, sleeps when idle |
| Pipeline | GitHub Actions (`.github/workflows/deploy.yml`) | unlimited on a public repo, 2,000 min/month on a private one |

Account: **Azure for Students**, which needs no credit card, so nothing can bill by surprise.
Every service above is free, so the $100 credit is a safety net (see §5), not the budget.

**One Web App serves everything.** The React build is copied into the API's `wwwroot` at
deploy time and served by `FrontendHosting.cs`, so the site, the login page and the API
share one URL and need no CORS setting. Static Web Apps would be the usual choice for the
frontend, but Azure for Students only lets you deploy to a handful of regions and Static
Web Apps runs in none of them.

How a release flows: push or merge to `main` → **CI** passes → **Deploy** builds the
frontend, bundles it into the published API, uploads that, then waits until the API
answers and the frontend is served. On boot the API applies any pending migrations itself
(`Database__MigrateOnStartup`).

> **Cold start.** After ~20 idle minutes the Web App sleeps, and after an idle hour the
> database pauses. The first visit after that can take about a minute, page included.
> **Open the site a few minutes before a demo or grading session.**

---

## 1. One-time Azure setup

Use **one resource group**. Azure for Students only allows certain regions. To see yours, run:

```bash
az policy assignment list --query "[?displayName=='Allowed resource deployment regions'].parameters.listOfAllowedLocations.value" -o tsv
```

At the time of writing that was Austria East, Spain Central, Germany West Central, Poland
Central and Denmark East. Being allowed is not enough, though, because each free tier is
only available in some of them:

| Free tier | Worked in | Refused in |
|---|---|---|
| App Service **F1** | **Austria East** | Germany West Central, Poland Central (`Current Limit (F1 VMs): 0`) |
| SQL **free offer** | **Germany West Central** | Austria East (`Provisioning of free limit database is not supported`) |

So the live deployment is split: the Web App runs in **Austria East** and the database in
**Germany West Central**, about 10 ms apart. Create the App Service plan first, since it
fails fastest. If your quotas differ and one region takes both, keep them together.

> **University accounts may require MFA.** If an `az` command fails with `AADSTS50076`,
> run the `az login --tenant ... --claims-challenge ...` line it prints and approve the
> prompt.

### 1.1 Database

1. Create **SQL database**. On the Basics tab, accept the **"Apply offer"** banner for the free
   Azure SQL Database offer.
2. **Server → Create new**. Authentication: **Use SQL authentication**. Pick an admin login
   and a strong password, and keep them in your password manager.
3. **Behavior when free limit reached: Auto-pause the database until next month**. Leave
   "continue using for additional charges" alone until §5 says otherwise.
4. Networking: Public endpoint. Turn on **Allow Azure services and resources to access this
   server** (that's how the API gets in) and **Add current client IP address** (that's how
   you load the demo data).
5. Once created: database → **Connection strings** → **ADO.NET (SQL authentication)**. Copy
   it and replace `{your_password}`. This is `ConnectionStrings__DefaultConnection` below.

### 1.2 Web App (API + frontend)

1. Create **Web App**: Publish **Code**, Runtime stack **.NET 10 (LTS)**, OS **Linux**,
   same region, pricing plan **Free F1**.
2. Note the **Default domain** on the Overview page. Copy it rather than guessing, because
   new apps may get a unique one like `hrapp-abc123.austriaeast-01.azurewebsites.net`.
   `https://` + that is your **site URL**. It is both the frontend and the API.
3. **Settings → Configuration → General settings**: **SCM Basic Auth Publishing Credentials
   = On** (the publish profile needs it), **HTTPS Only = On**. Save.
4. **Settings → Environment variables → App settings**, add:

   | Name | Value |
   |---|---|
   | `ConnectionStrings__DefaultConnection` | the ADO.NET string from 1.1 |
   | `Database__MigrateOnStartup` | `true` |
   | `Jwt__Key` | a fresh random key, see below. **Never** the dev key from `appsettings.Development.json` |
   | `Jwt__Issuer` | the site URL |
   | `Jwt__Audience` | the site URL |
   | `BootstrapAdmin__Email` | the first admin's login, e.g. `admin@hrapp.demo`. It is only a user name; no mail is sent |
   | `BootstrapAdmin__Password` | that admin's password (6+ characters; make it strong) |

   No `Cors__AllowedOrigins__0`: the frontend has the same origin as the API.

   Generate the key in PowerShell:

   ```powershell
   $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString('x2') })
   ```

5. Overview → **Download publish profile**. You'll paste the whole XML into GitHub.

<details>
<summary>The same with the Azure CLI</summary>

```bash
APP_LOC=austriaeast; DB_LOC=germanywestcentral; RG=rg-hrapp; SQL=hrapp-sql-<unique>; APP=hrapp-<unique>
az group create -n $RG -l $DB_LOC
az appservice plan create -g $RG -n plan-hrapp -l $APP_LOC --sku F1 --is-linux   # first: fails fast on 0 quota
az sql server create -g $RG -n $SQL -l $DB_LOC --admin-user '<sql-admin-login>' --admin-password '<strong password>'
az sql db create -g $RG -s $SQL -n HRApp -e GeneralPurpose -f Gen5 -c 2 --compute-model Serverless \
  --use-free-limit --free-limit-exhaustion-behavior AutoPause --backup-storage-redundancy Local
az sql server firewall-rule create -g $RG -s $SQL -n AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
az webapp create -g $RG -p plan-hrapp -n $APP --runtime "DOTNETCORE:10.0"
az webapp update -g $RG -n $APP --https-only true
az resource update -g $RG --namespace Microsoft.Web --resource-type basicPublishingCredentialsPolicies \
  --parent sites/$APP -n scm --set properties.allow=true
az webapp config appsettings set -g $RG -n $APP -o none --settings "ConnectionStrings__DefaultConnection=..." ...
az webapp deployment list-publishing-profiles -g $RG -n $APP --xml > publish-profile.xml   # never commit this
```

`--use-free-limit` is what makes the database free; without it you get a billed one.
</details>

## 2. GitHub setup

In the repository whose Actions run the deploy: **Settings → Secrets and variables →
Actions** (needs admin rights on the repo):

| Kind | Name | Value |
|---|---|---|
| Secret | `AZUREAPPSERVICE_PUBLISHPROFILE` | the publish profile XML from 1.2 |
| Variable | `AZURE_WEBAPP_NAME` | the Web App's name |
| Variable | `API_URL` | the site URL from 1.2, with `https://` |

Until both variables exist, the Deploy workflow skips instead of failing.

## 3. First deploy

1. Get the code onto `main` (merge the PR). CI runs, then **Deploy** runs. Once
   `deploy.yml` is on `main` you can also start it from **Actions → Deploy → Run workflow**.
2. The **Wait for the API to come up** step passes once the API answers. By then it has
   created every table and the bootstrap admin. **Check the frontend is served** then
   confirms the React app loads at `/` and at a deep link. If either fails, open the Web
   App's **Log stream**: a wrong connection string, a missing `Jwt__Key` or a bad
   bootstrap setting all show up there.
3. Open the site URL and log in as the bootstrap admin.
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
If your account is the server's **Microsoft Entra admin** (SQL server → Microsoft Entra ID;
the live deployment has the student account set), the Query editor signs you in with it, so
no SQL password is needed. Both scripts are idempotent, so running them twice adds nothing.

That gives you 7 departments, 19 employees with dossiers and 2026 leave allowances, 16 leave
requests, 12 assets and 7 document templates. Demo employees have **no logins**. To show
the employee side, register an account from the admin UI.

Only ever load made-up people: the site is on the public internet.

## 5. Running it

- **Leave allowances are per year.** The seed creates 2026 rows only, and a request with no
  allowance is refused. In January, run **Carry over** from 2026 on the *Leave allowances*
  page, which also creates the 2027 allowances.
- **Don't point an uptime monitor at the site.** Keeping the database awake burns the
  monthly allowance, and once it's gone the database pauses until next month. Close SSMS /
  VS Code connections when you're done for the same reason, and watch **Free amount
  remaining** on the database's Overview page.
- Rotating `Jwt__Key` logs everyone out. Nothing else breaks.
- Swagger is off in Production on purpose. Use it locally.

### Before a demo or the defense

The free tiers are fine day to day. For the week that matters, spend a few dollars of the
student credit to take the risk out:

- **No cold start:** App Service plan → **Scale up** → **Basic B1** (about $13/month, billed
  by the hour), then Web App → Configuration → **Always On = On**. Scale back to **F1**
  afterwards. Always On pings `/`, which never touches the database, so it does not burn the
  free database allowance.
- **No mid-month database pause:** in the defense month, set the database's *free limit
  reached* behaviour to **Continue using for additional charges**, so an exhausted allowance
  bills the credit (a few dollars at this scale) instead of locking the database until the
  1st. Switch it back afterwards.
- **Don't run the credit dry.** When the $100 is spent, or 12 months after sign-up, Azure
  disables the subscription and everything in it. Renewal needs a valid student status.

### After graduation

Export the database (**Export → .bacpac**) before your student status lapses, then delete
the resource group.

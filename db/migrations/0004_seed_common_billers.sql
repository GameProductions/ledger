-- Common Billers — seeded as stable reference data across all industries

--> statement-breakpoint
INSERT INTO "billers" ("id", "name", "website", "logo_url", "industry") VALUES
  -- 🎬 Streaming & Entertainment
  ('biller_netflix', 'Netflix', 'https://www.netflix.com', 'https://www.netflix.com/favicon.ico', 'Streaming'),
  ('biller_hulu', 'Hulu', 'https://www.hulu.com', 'https://www.hulu.com/favicon.ico', 'Streaming'),
  ('biller_disney_plus', 'Disney+', 'https://www.disneyplus.com', 'https://www.disneyplus.com/favicon.ico', 'Streaming'),
  ('biller_hbo_max', 'HBO Max', 'https://www.hbomax.com', 'https://www.hbomax.com/favicon.ico', 'Streaming'),
  ('biller_paramount_plus', 'Paramount+', 'https://www.paramountplus.com', 'https://www.paramountplus.com/favicon.ico', 'Streaming'),
  ('biller_peacock', 'Peacock', 'https://www.peacocktv.com', 'https://www.peacocktv.com/favicon.ico', 'Streaming'),
  ('biller_apple_tv', 'Apple TV+', 'https://tv.apple.com', 'https://tv.apple.com/favicon.ico', 'Streaming'),
  ('biller_amazon_prime', 'Amazon Prime', 'https://www.amazon.com', 'https://www.amazon.com/favicon.ico', 'Streaming'),
  ('biller_youtube_premium', 'YouTube Premium', 'https://www.youtube.com/premium', 'https://www.youtube.com/favicon.ico', 'Streaming'),
  ('biller_spotify', 'Spotify', 'https://www.spotify.com', 'https://www.spotify.com/favicon.ico', 'Streaming'),
  ('biller_apple_music', 'Apple Music', 'https://music.apple.com', 'https://music.apple.com/favicon.ico', 'Streaming'),
  ('biller_tidal', 'Tidal', 'https://tidal.com', 'https://tidal.com/favicon.ico', 'Streaming'),
  ('biller_audible', 'Audible', 'https://www.audible.com', 'https://www.audible.com/favicon.ico', 'Streaming'),
  ('biller_pandora', 'Pandora', 'https://www.pandora.com', 'https://www.pandora.com/favicon.ico', 'Streaming'),

  -- 📡 Internet & Phone
  ('biller_xfinity', 'Comcast Xfinity', 'https://www.xfinity.com', 'https://www.xfinity.com/favicon.ico', 'Internet'),
  ('biller_att', 'AT&T', 'https://www.att.com', 'https://www.att.com/favicon.ico', 'Internet'),
  ('biller_verizon', 'Verizon', 'https://www.verizon.com', 'https://www.verizon.com/favicon.ico', 'Internet'),
  ('biller_tmobile', 'T-Mobile', 'https://www.t-mobile.com', 'https://www.t-mobile.com/favicon.ico', 'Internet'),
  ('biller_spectrum', 'Spectrum', 'https://www.spectrum.com', 'https://www.spectrum.com/favicon.ico', 'Internet'),
  ('biller_cox', 'Cox Communications', 'https://www.cox.com', 'https://www.cox.com/favicon.ico', 'Internet'),
  ('biller_optimum', 'Optimum', 'https://www.optimum.com', 'https://www.optimum.com/favicon.ico', 'Internet'),
  ('biller_google_fiber', 'Google Fiber', 'https://fiber.google.com', 'https://fiber.google.com/favicon.ico', 'Internet'),
  ('biller_mint_mobile', 'Mint Mobile', 'https://www.mintmobile.com', 'https://www.mintmobile.com/favicon.ico', 'Internet'),
  ('biller_centurylink', 'CenturyLink', 'https://www.centurylink.com', 'https://www.centurylink.com/favicon.ico', 'Internet'),

  -- ⚡ Utilities
  ('biller_duke_energy', 'Duke Energy', 'https://www.duke-energy.com', 'https://www.duke-energy.com/favicon.ico', 'Utilities'),
  ('biller_pge', 'PG&E', 'https://www.pge.com', 'https://www.pge.com/favicon.ico', 'Utilities'),
  ('biller_sce', 'Southern California Edison', 'https://www.sce.com', 'https://www.sce.com/favicon.ico', 'Utilities'),
  ('biller_national_grid', 'National Grid', 'https://www.nationalgrid.com', 'https://www.nationalgrid.com/favicon.ico', 'Utilities'),
  ('biller_conedison', 'Consolidated Edison', 'https://www.coned.com', 'https://www.coned.com/favicon.ico', 'Utilities'),
  ('biller_exelon', 'Exelon', 'https://www.exeloncorp.com', 'https://www.exeloncorp.com/favicon.ico', 'Utilities'),
  ('biller_dominion', 'Dominion Energy', 'https://www.dominionenergy.com', 'https://www.dominionenergy.com/favicon.ico', 'Utilities'),
  ('biller_american_water', 'American Water', 'https://www.amwater.com', 'https://www.amwater.com/favicon.ico', 'Utilities'),

  -- 🏠 Insurance
  ('biller_geico', 'Geico', 'https://www.geico.com', 'https://www.geico.com/favicon.ico', 'Insurance'),
  ('biller_progressive', 'Progressive', 'https://www.progressive.com', 'https://www.progressive.com/favicon.ico', 'Insurance'),
  ('biller_state_farm', 'State Farm', 'https://www.statefarm.com', 'https://www.statefarm.com/favicon.ico', 'Insurance'),
  ('biller_allstate', 'Allstate', 'https://www.allstate.com', 'https://www.allstate.com/favicon.ico', 'Insurance'),
  ('biller_liberty_mutual', 'Liberty Mutual', 'https://www.libertymutual.com', 'https://www.libertymutual.com/favicon.ico', 'Insurance'),
  ('biller_nationwide', 'Nationwide', 'https://www.nationwide.com', 'https://www.nationwide.com/favicon.ico', 'Insurance'),
  ('biller_usaa', 'USAA', 'https://www.usaa.com', 'https://www.usaa.com/favicon.ico', 'Insurance'),
  ('biller_aflac', 'Aflac', 'https://www.aflac.com', 'https://www.aflac.com/favicon.ico', 'Insurance'),
  ('biller_metlife', 'MetLife', 'https://www.metlife.com', 'https://www.metlife.com/favicon.ico', 'Insurance'),

  -- 💻 Software & SaaS
  ('biller_microsoft_365', 'Microsoft 365', 'https://www.microsoft.com/microsoft-365', 'https://www.microsoft.com/favicon.ico', 'SaaS'),
  ('biller_google_workspace', 'Google Workspace', 'https://workspace.google.com', 'https://workspace.google.com/favicon.ico', 'SaaS'),
  ('biller_dropbox', 'Dropbox', 'https://www.dropbox.com', 'https://www.dropbox.com/favicon.ico', 'SaaS'),
  ('biller_icloud', 'iCloud+', 'https://www.icloud.com', 'https://www.icloud.com/favicon.ico', 'SaaS'),
  ('biller_notion', 'Notion', 'https://www.notion.so', 'https://www.notion.so/favicon.ico', 'SaaS'),
  ('biller_figma', 'Figma', 'https://www.figma.com', 'https://www.figma.com/favicon.ico', 'SaaS'),
  ('biller_slack', 'Slack', 'https://slack.com', 'https://slack.com/favicon.ico', 'SaaS'),
  ('biller_adobe_creative', 'Adobe Creative Cloud', 'https://www.adobe.com/creativecloud', 'https://www.adobe.com/favicon.ico', 'SaaS'),
  ('biller_github', 'GitHub', 'https://github.com', 'https://github.com/favicon.ico', 'SaaS'),
  ('biller_digitalocean', 'DigitalOcean', 'https://www.digitalocean.com', 'https://www.digitalocean.com/favicon.ico', 'SaaS'),
  ('biller_aws', 'Amazon Web Services', 'https://aws.amazon.com', 'https://aws.amazon.com/favicon.ico', 'SaaS'),
  ('biller_cloudflare', 'Cloudflare', 'https://www.cloudflare.com', 'https://www.cloudflare.com/favicon.ico', 'SaaS'),

  -- 🏦 Finance
  ('biller_chase', 'Chase', 'https://www.chase.com', 'https://www.chase.com/favicon.ico', 'Finance'),
  ('biller_bank_of_america', 'Bank of America', 'https://www.bankofamerica.com', 'https://www.bankofamerica.com/favicon.ico', 'Finance'),
  ('biller_wells_fargo', 'Wells Fargo', 'https://www.wellsfargo.com', 'https://www.wellsfargo.com/favicon.ico', 'Finance'),
  ('biller_citi', 'Citi', 'https://www.citi.com', 'https://www.citi.com/favicon.ico', 'Finance'),
  ('biller_capital_one', 'Capital One', 'https://www.capitalone.com', 'https://www.capitalone.com/favicon.ico', 'Finance'),
  ('biller_robinhood', 'Robinhood', 'https://robinhood.com', 'https://robinhood.com/favicon.ico', 'Finance'),
  ('biller_vanguard', 'Vanguard', 'https://vanguard.com', 'https://vanguard.com/favicon.ico', 'Finance'),
  ('biller_fidelity', 'Fidelity', 'https://www.fidelity.com', 'https://www.fidelity.com/favicon.ico', 'Finance'),
  ('biller_coinbase', 'Coinbase', 'https://www.coinbase.com', 'https://www.coinbase.com/favicon.ico', 'Finance'),
  ('biller_ynab', 'YNAB', 'https://www.ynab.com', 'https://www.ynab.com/favicon.ico', 'Finance'),
  ('biller_betterment', 'Betterment', 'https://www.betterment.com', 'https://www.betterment.com/favicon.ico', 'Finance'),
  ('biller_mint', 'Mint', 'https://mint.intuit.com', 'https://mint.intuit.com/favicon.ico', 'Finance'),

  -- 💳 Credit Cards (issuers)
  ('biller_amex', 'American Express', 'https://www.americanexpress.com', 'https://www.americanexpress.com/favicon.ico', 'Finance'),
  ('biller_discover', 'Discover', 'https://www.discover.com', 'https://www.discover.com/favicon.ico', 'Finance'),

  -- 🏋️ Health & Fitness
  ('biller_peloton', 'Peloton', 'https://www.onepeloton.com', 'https://www.onepeloton.com/favicon.ico', 'Fitness'),
  ('biller_classpass', 'ClassPass', 'https://classpass.com', 'https://classpass.com/favicon.ico', 'Fitness'),
  ('biller_planet_fitness', 'Planet Fitness', 'https://www.planetfitness.com', 'https://www.planetfitness.com/favicon.ico', 'Fitness'),
  ('biller_equinox', 'Equinox', 'https://www.equinox.com', 'https://www.equinox.com/favicon.ico', 'Fitness'),
  ('biller_apple_fitness', 'Apple Fitness+', 'https://www.apple.com/apple-fitness-plus', 'https://www.apple.com/favicon.ico', 'Fitness'),
  ('biller_calm', 'Calm', 'https://www.calm.com', 'https://www.calm.com/favicon.ico', 'Fitness'),
  ('biller_headspace', 'Headspace', 'https://www.headspace.com', 'https://www.headspace.com/favicon.ico', 'Fitness'),
  ('biller_noom', 'Noom', 'https://www.noom.com', 'https://www.noom.com/favicon.ico', 'Fitness'),
  ('biller_ww', 'WeightWatchers', 'https://www.weightwatchers.com', 'https://www.weightwatchers.com/favicon.ico', 'Fitness'),

  -- 🚗 Transportation
  ('biller_uber', 'Uber', 'https://www.uber.com', 'https://www.uber.com/favicon.ico', 'Transportation'),
  ('biller_lyft', 'Lyft', 'https://www.lyft.com', 'https://www.lyft.com/favicon.ico', 'Transportation'),
  ('biller_hertz', 'Hertz', 'https://www.hertz.com', 'https://www.hertz.com/favicon.ico', 'Transportation'),
  ('biller_avis', 'Avis', 'https://www.avis.com', 'https://www.avis.com/favicon.ico', 'Transportation'),
  ('biller_enterprise', 'Enterprise Rent-A-Car', 'https://www.enterprise.com', 'https://www.enterprise.com/favicon.ico', 'Transportation'),

  -- 🛒 Shopping & Delivery
  ('biller_walmart', 'Walmart', 'https://www.walmart.com', 'https://www.walmart.com/favicon.ico', 'Retail'),
  ('biller_target', 'Target', 'https://www.target.com', 'https://www.target.com/favicon.ico', 'Retail'),
  ('biller_costco', 'Costco', 'https://www.costco.com', 'https://www.costco.com/favicon.ico', 'Retail'),
  ('biller_sams_club', 'Sam''s Club', 'https://www.samsclub.com', 'https://www.samsclub.com/favicon.ico', 'Retail'),
  ('biller_doordash', 'DoorDash', 'https://www.doordash.com', 'https://www.doordash.com/favicon.ico', 'Delivery'),
  ('biller_grubhub', 'Grubhub', 'https://www.grubhub.com', 'https://www.grubhub.com/favicon.ico', 'Delivery'),
  ('biller_ubereats', 'Uber Eats', 'https://www.ubereats.com', 'https://www.ubereats.com/favicon.ico', 'Delivery'),
  ('biller_postmates', 'Postmates', 'https://postmates.com', 'https://postmates.com/favicon.ico', 'Delivery'),

  -- 🥘 Meal Kits
  ('biller_hellofresh', 'HelloFresh', 'https://www.hellofresh.com', 'https://www.hellofresh.com/favicon.ico', 'Meal Kits'),
  ('biller_blue_apron', 'Blue Apron', 'https://www.blueapron.com', 'https://www.blueapron.com/favicon.ico', 'Meal Kits'),
  ('biller_factor', 'Factor', 'https://www.factor75.com', 'https://www.factor75.com/favicon.ico', 'Meal Kits'),

  -- 📦 Other Services
  ('biller_usps', 'USPS', 'https://www.usps.com', 'https://www.usps.com/favicon.ico', 'Shipping'),
  ('biller_ups', 'UPS', 'https://www.ups.com', 'https://www.ups.com/favicon.ico', 'Shipping'),
  ('biller_fedex', 'FedEx', 'https://www.fedex.com', 'https://www.fedex.com/favicon.ico', 'Shipping'),
  ('biller_adp', 'ADP', 'https://www.adp.com', 'https://www.adp.com/favicon.ico', 'Payroll')
ON CONFLICT ("id") DO NOTHING;

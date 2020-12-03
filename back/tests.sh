# without params
curl localhost:8080

# with target_company valid
curl localhost:8080/?linkedin_target=https://www.linkedin.com/company/ap-capital-advisory/about/

# with target_company does not exist
curl localhost:8080/?linkedin_target=https://www.linkedin.com/company/xxxdoesntexistxxxx/about/

# a) with target_company exists + target_lead exists
curl "localhost:8080/?target_company=https://www.linkedin.com/company/ap-capital-advisory/about/&target_lead=https://www.linkedin.com/in/francis-berger-a2404094/"

# b) with target_company exists + target_lead exists
curl "localhost:8080/?target_company=https://www.linkedin.com/company/pennylaneaccounting/about/&target_lead=https://www.linkedin.com/in/arthur-waller-a793a611/"
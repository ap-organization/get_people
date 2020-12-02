npm run start &
read -p "Press enter to run: curl localhost:8080"
curl localhost:8080

npm run start &
read -p "Press enter to run: curl localhost:8080/?linkedin_target=https://www.linkedin.com/company/ap-capital-advisory/about/"
curl localhost:8080/?linkedin_target=https://www.linkedin.com/company/ap-capital-advisory/about/

npm run start &
read -p "Press enter to run: curl localhost:8080/?linkedin_target=https://www.linkedin.com/company/xxxdoesntexistxxxx/about/"
curl localhost:8080/?linkedin_target=https://www.linkedin.com/company/xxxdoesntexistxxxx/about/
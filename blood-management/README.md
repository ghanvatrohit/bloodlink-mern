# Blood Management & Chat Allotment System (MERN)

## Run
```
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && cp .env.example .env && npm install && npm start
```
Admins: register normally, then in MongoDB set `role: "admin"` on that user (manual assignment).

Roles: customer, donor, hospital, organization, admin.
Flow: Customer/Hospital opens chat with an Organization -> sends request (blood group + qty) -> Organization replies in real time -> Organization clicks "Allot Blood" -> inventory deducted, transaction created, requester sees "Blood Allotted Successfully".

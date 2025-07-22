Currently authentication with MSAL is implemented for the frontend and we are able to successfully authenticate
and protect routes in the admin ui.

However we haven't integrated it with our backend that will be responsable of managing the users.

We want to create the user if it doesn't exist, the first 10 users will be created as admins, later as normal users.

We want to allow admins to manage the users roles from the UI for other users, you can see a sample design at `ai/specs/image.png`, `ai/specs/image2.png` and `ai/specs/image3.png`

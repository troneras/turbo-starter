Investigate the API repository and implement a solution for the given problem.

Currently each time I write a new API route, I've to remember to publish the permissions to the database, what is error prone
Also the admin user won't have the new permissions added automatically. 
You can refactor without caring about migrating existing data, we are still in early development phase and the product is not live. 
I've thought on ways of doing it, like for example during the bootstrap phase, when the fastify plugins are loaded and the routes are registered, to register the permissions as well, and when registering the roles plugin, create by default the admin role if it doesn't exist and assign all permissions if has any missing. That way it just takes an application launch to set everything correctly.
That's just an idea and you may come with better ones. 
Think hard about how to implement this system.
The API lives at @apps/api

@apps/api/src/plugins/app/permissions/permissions-repository.ts
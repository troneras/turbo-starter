import { it, describe, expect, afterEach, beforeEach } from "bun:test";
import { build } from "../../helpers/build-app";
import { users, roles, userRoles, permissions, rolePermissions } from "@cms/db/schema";
import { eq } from "drizzle-orm";

describe("Test Users API - GET /api/test-users", () => {
  let app: any;

  beforeEach(async () => {
    app = await build();
    await app.ready();

    // Clear existing data
    await app.db.delete(rolePermissions);
    await app.db.delete(userRoles);
    await app.db.delete(users);
    await app.db.delete(permissions);
    await app.db.delete(roles);

    // Create test roles
    const testRoles = await app.db.insert(roles).values([
      { name: 'admin' },
      { name: 'editor' },
      { name: 'translator' }
    ]).returning();

    // Create test permissions
    const testPermissions = await app.db.insert(permissions).values([
      { name: 'users:read', description: 'Read users', resource: 'users', action: 'read' },
      { name: 'users:create', description: 'Create users', resource: 'users', action: 'create' },
      { name: 'translations:read', description: 'Read translations', resource: 'translations', action: 'read' },
      { name: 'translations:write', description: 'Write translations', resource: 'translations', action: 'write' }
    ]).returning();

    // Assign permissions to roles
    await app.db.insert(rolePermissions).values([
      // Admin gets all permissions
      { roleId: testRoles[0].id, permissionId: testPermissions[0].id },
      { roleId: testRoles[0].id, permissionId: testPermissions[1].id },
      { roleId: testRoles[0].id, permissionId: testPermissions[2].id },
      { roleId: testRoles[0].id, permissionId: testPermissions[3].id },
      // Editor gets read/write permissions
      { roleId: testRoles[1].id, permissionId: testPermissions[0].id },
      { roleId: testRoles[1].id, permissionId: testPermissions[2].id },
      { roleId: testRoles[1].id, permissionId: testPermissions[3].id },
      // Translator gets translation permissions
      { roleId: testRoles[2].id, permissionId: testPermissions[2].id },
      { roleId: testRoles[2].id, permissionId: testPermissions[3].id }
    ]);

    // Create test users
    const testUsers = await app.db.insert(users).values([
      {
        email: 'alice@company.com',
        name: 'Alice Johnson',
        status: 'active',
        is_test_user: true
      },
      {
        email: 'bob@company.com', 
        name: 'Bob Smith',
        status: 'active',
        is_test_user: true
      },
      {
        email: 'carol@company.com',
        name: 'Carol Davis', 
        status: 'active',
        is_test_user: true
      },
      {
        email: 'normal@company.com',
        name: 'Normal User',
        status: 'active',
        is_test_user: false // Not a test user
      }
    ]).returning();

    // Assign roles to test users
    await app.db.insert(userRoles).values([
      { userId: testUsers[0].id, roleId: testRoles[0].id }, // Alice - admin
      { userId: testUsers[1].id, roleId: testRoles[1].id }, // Bob - editor  
      { userId: testUsers[2].id, roleId: testRoles[2].id }, // Carol - translator
      { userId: testUsers[3].id, roleId: testRoles[1].id }  // Normal user - editor (but not test user)
    ]);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should return test users with their roles and permissions", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/test-users"
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      // Should have the three main test user types
      expect(result.admin).toBeDefined();
      expect(result.editor).toBeDefined(); 
      expect(result.translator).toBeDefined();

      // Validate admin user structure
      expect(result.admin.email).toBe('alice@company.com');
      expect(result.admin.name).toBe('Alice Johnson');
      expect(result.admin.roles).toContain('admin');
      expect(result.admin.permissions).toContain('users:read');
      expect(result.admin.permissions).toContain('users:create');
      expect(result.admin.jwt).toBe('mock-admin-jwt-token');

      // Validate editor user structure
      expect(result.editor.email).toBe('bob@company.com');
      expect(result.editor.name).toBe('Bob Smith');
      expect(result.editor.roles).toContain('editor');
      expect(result.editor.permissions).toContain('users:read');
      expect(result.editor.permissions).toContain('translations:read');
      expect(result.editor.jwt).toBe('mock-editor-jwt-token');

      // Validate translator user structure
      expect(result.translator.email).toBe('carol@company.com');
      expect(result.translator.name).toBe('Carol Davis');
      expect(result.translator.roles).toContain('translator');
      expect(result.translator.permissions).toContain('translations:read');
      expect(result.translator.permissions).toContain('translations:write');
      expect(result.translator.jwt).toBe('mock-translator-jwt-token');
    });

    it("should only return users flagged as test users", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/test-users"
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      // Should not include the normal user (is_test_user: false)
      const allEmails = [
        result.admin?.email,
        result.editor?.email, 
        result.translator?.email
      ].filter(Boolean);
      
      expect(allEmails).not.toContain('normal@company.com');
      expect(allEmails).toContain('alice@company.com');  
      expect(allEmails).toContain('bob@company.com');
      expect(allEmails).toContain('carol@company.com');
    });

    it("should handle missing test users gracefully", async () => {
      // Clear all test users - respect foreign key constraints
      await app.db.delete(rolePermissions);
      await app.db.delete(userRoles);
      await app.db.delete(users);
      await app.db.delete(permissions);
      await app.db.delete(roles);

      const response = await app.inject({
        method: "GET",
        url: "/api/test-users"
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      // Should return object with undefined values
      expect(result.admin).toBeUndefined();
      expect(result.editor).toBeUndefined();
      expect(result.translator).toBeUndefined();
    });
  });

  describe("Response Structure", () => {
    it("should return valid JSON structure matching schema", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/test-users"
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      // Validate top-level structure
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('admin');
      expect(result).toHaveProperty('editor'); 
      expect(result).toHaveProperty('translator');

      // Validate user object structure if present
      if (result.admin) {
        expect(result.admin).toHaveProperty('id');
        expect(result.admin).toHaveProperty('email');
        expect(result.admin).toHaveProperty('name');
        expect(result.admin).toHaveProperty('roles');
        expect(result.admin).toHaveProperty('permissions');
        expect(result.admin).toHaveProperty('jwt');
        expect(Array.isArray(result.admin.roles)).toBe(true);
        expect(Array.isArray(result.admin.permissions)).toBe(true);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      // Close database connection to simulate error
      await app.db.$client.end();

      const response = await app.inject({
        method: "GET",
        url: "/api/test-users"
      });

      expect(response.statusCode).toBe(500);
      const result = JSON.parse(response.payload);
      expect(result.message).toBe('Internal Server Error');
    });
  });
});
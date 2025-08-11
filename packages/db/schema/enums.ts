import { pgEnum } from 'drizzle-orm/pg-core'

// Release status enum
export const releaseStatusEnum = pgEnum('release_status', [
  'OPEN',
  'CLOSED', 
  'DEPLOYED',
  'ROLLED_BACK'
])

// Entity change type enum
export const entityChangeTypeEnum = pgEnum('entity_change_type', [
  'CREATE',
  'UPDATE',
  'DELETE'
])

// Relation action type enum
export const relationActionTypeEnum = pgEnum('relation_action_type', [
  'ADD',
  'REMOVE'
])

// Entity type enum for common entity types
export const entityTypeEnum = pgEnum('entity_type_enum', [
  'translation',
  'translation_key',
  'feature_flag', 
  'setting',
  'page',
  'article',
  'content',
  'menu',
  'navigation',
  'component',
  'template',
  'media',
  'user_preference'
]) 
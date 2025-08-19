import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, and, like, or, sql, count, desc, asc } from 'drizzle-orm'
import { locales } from '@cms/db/schema'
import type { Locale, NewLocale } from '@cms/db/schema'

declare module 'fastify' {
    interface FastifyInstance {
        locales: ReturnType<typeof localesRepository>
    }
}

interface CreateLocaleData {
    code: string
    name: string
}

interface UpdateLocaleData {
    code?: string
    name?: string
}

interface ListLocalesFilters {
    search?: string
}

interface ListLocalesResult {
    locales: Locale[]
    total: number
    page: number
    pageSize: number
}

export function localesRepository(fastify: FastifyInstance) {
    return {
        // List locales with pagination, search, and filtering
        async listLocales(
            page: number = 1,
            pageSize: number = 20,
            filters: ListLocalesFilters & { sortBy?: string, sortDirection?: 'asc' | 'desc' } = {}
        ): Promise<ListLocalesResult> {
            const offset = (page - 1) * pageSize
            const { search, sortBy = 'name', sortDirection = 'asc' } = filters

            // Build base query
            let baseQuery = fastify.db.select().from(locales)
            let countQuery = fastify.db.select({ count: count() }).from(locales)

            // Apply search filter
            if (search) {
                const searchFilter = or(
                    like(locales.code, `%${search}%`),
                    like(locales.name, `%${search}%`)
                )
                baseQuery = (baseQuery as any).where(searchFilter)
                countQuery = (countQuery as any).where(searchFilter)
            }

            // Apply sorting
            const sortColumn = (() => {
                switch (sortBy) {
                    case 'code': return locales.code
                    case 'name':
                    default: return locales.name
                }
            })()
            baseQuery = (baseQuery as any).orderBy(sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn))

            // Execute queries
            const [allLocales, totalResult] = await Promise.all([
                (baseQuery as any).limit(pageSize).offset(offset),
                countQuery as any
            ])

            const total = totalResult[0]?.count as number || 0

            return {
                locales: allLocales,
                total,
                page,
                pageSize
            }
        },

        // Get all locales without pagination
        async getAllLocales(): Promise<Locale[]> {
            const allLocales = await fastify.db
                .select()
                .from(locales)
                .orderBy(locales.name)

            return allLocales
        },

        // Get locale by ID
        async getLocaleById(id: number): Promise<Locale | null> {
            const [locale] = await fastify.db
                .select()
                .from(locales)
                .where(eq(locales.id, id))
                .limit(1)

            return locale || null
        },

        // Get locale by code
        async getLocaleByCode(code: string): Promise<Locale | null> {
            const [locale] = await fastify.db
                .select()
                .from(locales)
                .where(eq(locales.code, code))
                .limit(1)

            return locale || null
        },

        // Create new locale
        async createLocale(data: CreateLocaleData): Promise<Locale> {
            // Check if locale code already exists
            const existingLocale = await this.getLocaleByCode(data.code)
            if (existingLocale) {
                throw new Error('Locale with this code already exists')
            }

            const [newLocale] = await fastify.db
                .insert(locales)
                .values({
                    code: data.code,
                    name: data.name
                })
                .returning()

            if (!newLocale) {
                throw new Error('Failed to create locale')
            }

            return newLocale
        },

        // Update locale
        async updateLocale(id: number, updates: UpdateLocaleData): Promise<Locale> {
            // Check if locale exists
            const existingLocale = await this.getLocaleById(id)
            if (!existingLocale) {
                throw new Error('Locale not found')
            }

            // Check code uniqueness if updating code
            if (updates.code && updates.code !== existingLocale.code) {
                const existingCodeLocale = await this.getLocaleByCode(updates.code)
                if (existingCodeLocale) {
                    throw new Error('Locale with this code already exists')
                }
            }

            // Build update data
            const updateData: Partial<NewLocale> = {}
            if (updates.code !== undefined) updateData.code = updates.code
            if (updates.name !== undefined) updateData.name = updates.name

            if (Object.keys(updateData).length === 0) {
                throw new Error('No updates provided')
            }

            const [updatedLocale] = await fastify.db
                .update(locales)
                .set(updateData)
                .where(eq(locales.id, id))
                .returning()

            if (!updatedLocale) {
                throw new Error('Failed to update locale')
            }

            return updatedLocale
        },

        // Delete locale
        async deleteLocale(id: number): Promise<void> {
            // Check if locale exists
            const locale = await this.getLocaleById(id)
            if (!locale) {
                throw new Error('Locale not found')
            }

            // Note: In a production system, you might want to check for references
            // before allowing deletion (e.g., translations using this locale)
            // and implement soft delete instead

            await fastify.db.delete(locales).where(eq(locales.id, id))
        },

        // Check if locale is being used by other entities
        async isLocaleInUse(id: number): Promise<boolean> {
            // This could be extended to check various tables that reference locales
            // For now, we'll return false but this should be implemented based on your schema

            // Example checks you might want to add:
            // - Check if locale is used in translations
            // - Check if locale is used in brand_locales
            // - Check if locale is used in entity_versions

            // For now, just check if the locale exists
            const locale = await this.getLocaleById(id)
            return locale !== null
        },

        // Get locale usage statistics
        async getLocaleStats(id: number): Promise<{
            translationCount: number
            // Add other usage counts as needed
        }> {
            const locale = await this.getLocaleById(id)
            if (!locale) {
                throw new Error('Locale not found')
            }

            // This is a placeholder - you would implement actual counts based on your schema
            // For example, counting translations, entity_versions, etc.
            const translationCount = 0 // Placeholder

            return {
                translationCount
            }
        }
    }
}

export default fp(async function (fastify: FastifyInstance) {
    const repo = localesRepository(fastify)
    fastify.decorate('locales', repo)
}, {
    name: 'locales',
    dependencies: ['db']
})

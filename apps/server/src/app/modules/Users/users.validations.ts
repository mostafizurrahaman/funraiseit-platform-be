import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredEmail,
  usaPhoneRegex,
  enumString,
  requiredMongooseId,
} from '@repo/shared'
import { AuthRoles, AuthRolesValues, AuthStatusValues, usersSortableFields } from 'packages/db/src'

const createUsersSchema = z.object({
  body: z.object({
    name: requiredString('Name'),
    email: requiredEmail('Email'),
    password: requiredString('Password').min(1, {
      error: `Password is required`,
    }),
    phoneNumber: z
      .string({
        error: 'Phone number is required!',
      })
      .regex(usaPhoneRegex, {
        error: 'Phone number must be valid usa number.',
      }),
    role: enumString([AuthRoles.ADMIN, AuthRoles.SUPPORT_ADMIN], 'Role'),
  }),
})

const updateUsersSchema = z.object({
  params: z.object({
    id: requiredMongooseId('ID'),
  }),
  body: z.object({
    name: optionalString('Name'),
    phoneNumber: z
      .string({
        error: 'Phone number is required!',
      })
      .regex(usaPhoneRegex, {
        error: 'Phone number must be valid usa number.',
      })
      .optional(),
  }),
})

const getAllUsersSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    role: optionalEnumString(AuthRolesValues, 'Role'),
    status: optionalEnumString(AuthStatusValues, 'Status'),
    sortBy: optionalEnumString(usersSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getAllOrganizationSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    role: optionalEnumString(AuthRolesValues, 'Role'),
    status: optionalEnumString(AuthStatusValues, 'Status'),
    sortBy: optionalEnumString(usersSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getUsersByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId('ID'),
  }),
})

// const deleteUsersByIdSchema = z.object({
//   params: z.object({
//     id: requiredString('ID'),
//   }),
// })

export const usersValidations = {
  createUsersSchema,
  updateUsersSchema,
  getAllUsersSchema,
  getUsersByIdSchema,
  getAllOrganizationSchema,
  // deleteUsersByIdSchema,
}

export type TCreateUsersPayloadType = z.infer<typeof createUsersSchema.shape.body>
export type TUpdateUsersPayloadType = z.infer<typeof updateUsersSchema.shape.body>
export type TGetAllUsersQueryParamsType = z.infer<typeof getAllUsersSchema.shape.query>
export type TGetAllOrganizationsQueryParamsType = z.infer<
  typeof getAllOrganizationSchema.shape.query
>
export type TGetUsersByIdParamsType = z.infer<typeof getUsersByIdSchema.shape.params>
// export type TDeleteUsersByIdParamsType = z.infer<typeof deleteUsersByIdSchema.shape.params>

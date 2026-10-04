import { z } from 'zod';

/**
 * Normalizes and validates contact string (either email or phone).
 */
export const contactRegex = {
  // Simple flexible phone regex: allows +, digits, spaces, parentheses, dashes (min 7 digits)
  phone: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/,
  // Standard RFC-compliant email regex pattern
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

export const UserInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full Name must be at least 2 characters long')
    .max(100, 'Full Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .refine((val) => !val || contactRegex.email.test(val), {
      message: 'Please provide a valid Gmail / Email address (e.g. yourname@gmail.com)',
    })
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || contactRegex.phone.test(val), {
      message: 'Please provide a valid mobile / phone number (at least 7 digits)',
    })
    .optional()
    .or(z.literal('')),
  contact: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
  intake: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
  isCounselled: z
    .boolean()
    .optional()
    .default(true)
    .refine((val) => val !== false, {
      message: 'You must complete an in-office counselling session to spin the wheel',
    }),
  preferredCountry: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
  consent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must verify and agree to promotional terms to participate',
    }),
  deviceId: z
    .string()
    .trim()
    .min(10, 'Invalid device identifier'),
}).refine(
  (data) => {
    if (data.email && data.phone) {
      return contactRegex.email.test(data.email) && contactRegex.phone.test(data.phone);
    }
    if (data.contact) {
      return contactRegex.email.test(data.contact) || contactRegex.phone.test(data.contact);
    }
    return false;
  },
  {
    message: 'Both a valid Gmail/Email address and Phone number are required',
    path: ['email'],
  }
);

export const StartSpinSchema = UserInfoSchema;

export const SpinRequestSchema = z.object({
  token: z
    .string()
    .trim()
    .min(16, 'Invalid or malformed spin token'),
  deviceId: z
    .string()
    .trim()
    .min(10, 'Invalid device identifier')
    .optional(),
});

export const AdminLoginSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const UpdatePrizeNamesSchema = z.object({
  customNames: z.record(
    z.coerce.number().int().min(0).max(11),
    z.string().trim().min(1, 'Prize label cannot be empty').max(50, 'Prize label cannot exceed 50 characters')
  ),
});

export const AdminSpinQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  prizeType: z.enum(['all', 'grand', 'lucky', 'win', 'loss']).default('all'),
  fromDate: z.string().trim().optional(),
  toDate: z.string().trim().optional(),
});

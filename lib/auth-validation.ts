import {z} from 'zod';

export const signupEmailSchema=z.object({email:z.email().max(254).transform(email=>email.trim().toLowerCase())}).strict();
export const signupCodeSchema=signupEmailSchema.extend({token:z.string().regex(/^\d{6,10}$/,'Enter the verification code from your email.')});

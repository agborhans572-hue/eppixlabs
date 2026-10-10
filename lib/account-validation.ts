import {z} from 'zod';

const text=(max:number)=>z.string().trim().min(1).max(max);
export const addressSchema=z.object({id:z.uuid(),label:z.string().trim().max(80),firstName:text(75),lastName:text(75),line1:text(200),line2:z.string().trim().max(200),city:text(100),state:text(100),postalCode:text(30),country:text(100)}).strict();
export const accountSettingsSchema=z.object({addresses:z.array(addressSchema).max(20),preferences:z.array(z.enum(['sales','launches','restocks','research'])).max(4)}).strict();
export const accountMessageSchema=z.object({message:text(5000)}).strict();
export type AccountSettings=z.infer<typeof accountSettingsSchema>;
export type AccountAddress=z.infer<typeof addressSchema>;
export type AccountMessage={id:number;message:string;createdAt:string};
export type AccountData=AccountSettings&{messages:AccountMessage[]};
export function readAccountSettings(value:unknown):AccountSettings {
  const parsed=accountSettingsSchema.safeParse(value);
  return parsed.success?parsed.data:{addresses:[],preferences:[]};
}

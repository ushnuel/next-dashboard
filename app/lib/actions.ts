'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  date: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['paid', 'pending']),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const invoicePage = '/dashboard/invoices';

export const createInvoice = async (formdata: FormData) => {
  try {
    const { amount, status, customerId } = CreateInvoice.parse({
      customerId: formdata.get('customerId'),
      amount: formdata.get('amount'),
      status: formdata.get('status'),
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    await sql`insert into invoices (customer_id, amount, status, date)
      values (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.log('create invoice error', error);
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath(invoicePage);
  redirect(invoicePage);
};

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  try {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.log('update invoice error', error);
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath(invoicePage);
  redirect(invoicePage);
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    console.log('delete invoice error', error);
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}

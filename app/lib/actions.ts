'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const FormSchema = z.object({
  id: z.string(),
  date: z.string(),
  customerId: z.string({ invalid_type_error: 'Please select a customer.' }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['paid', 'pending'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const invoicePage = '/dashboard/invoices';

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export const createInvoice = async (prevState: State, formdata: FormData) => {
  try {
    const validatedFields = CreateInvoice.safeParse({
      customerId: formdata.get('customerId'),
      amount: formdata.get('amount'),
      status: formdata.get('status'),
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }

    const { customerId, amount, status } = validatedFields.data;
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

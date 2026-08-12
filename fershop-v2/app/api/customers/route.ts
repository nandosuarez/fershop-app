import { NextResponse } from "next/server";

import {
  createCustomer,
  getCustomers,
  getCustomerStoreError,
} from "@/lib/server/customer-store";
import type { CreateCustomerInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ customers: await getCustomers() });
  } catch (error) {
    const failure = getCustomerStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<CreateCustomerInput>;
    const customer = await createCustomer({
      fullName: payload.fullName ?? "",
      email: payload.email ?? "",
      phone: payload.phone ?? "",
      address: payload.address ?? "",
      city: payload.city ?? "",
      department: payload.department ?? "",
      postalCode: payload.postalCode,
      country: payload.country ?? "Colombia",
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    const failure = getCustomerStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

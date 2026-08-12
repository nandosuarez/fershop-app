import { NextResponse } from "next/server";

import { getCustomerStoreError, updateCustomer } from "@/lib/server/customer-store";
import type { UpdateCustomerInput } from "@/lib/types";

interface CustomerRouteProps {
  params: Promise<{ customerId: string }>;
}

export async function PUT(request: Request, { params }: CustomerRouteProps) {
  try {
    const { customerId } = await params;
    const payload = (await request.json()) as Partial<UpdateCustomerInput>;
    const customer = await updateCustomer(customerId, {
      fullName: payload.fullName ?? "",
      email: payload.email ?? "",
      phone: payload.phone ?? "",
      address: payload.address ?? "",
      city: payload.city ?? "",
      department: payload.department ?? "",
      postalCode: payload.postalCode,
      country: payload.country ?? "Colombia",
    });
    return NextResponse.json({ customer });
  } catch (error) {
    const failure = getCustomerStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

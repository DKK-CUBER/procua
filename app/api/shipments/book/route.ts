import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createShiprocketOrder, getShiprocketConfig } from '@/lib/server/shipping/shiprocketService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      poId,
      pickupAddress,
      deliveryAddress,
      packageDetails
    } = body;

    if (!poId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PO_ID', message: 'PO ID is required.' },
        { status: 400 }
      );
    }

    // 1. Strict Validation Gates
    if (!pickupAddress?.isConfirmed || !pickupAddress?.address || !pickupAddress?.pincode) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNCONFIRMED_PICKUP_ADDRESS',
          message: 'Supplier pickup address and pincode must be explicitly confirmed before booking.'
        },
        { status: 400 }
      );
    }

    if (!deliveryAddress?.isConfirmed || !deliveryAddress?.address || !deliveryAddress?.pincode) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNCONFIRMED_DELIVERY_ADDRESS',
          message: 'Buyer delivery destination address and pincode must be confirmed.'
        },
        { status: 400 }
      );
    }

    if (!packageDetails?.isConfirmed || !packageDetails?.weightKg || Number(packageDetails.weightKg) <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNCONFIRMED_PACKAGE_DETAILS',
          message: 'Package weight (kg) and dimensions must be verified before courier dispatch.'
        },
        { status: 400 }
      );
    }

    // 2. Fetch Purchase Order
    let poRecord = await db.purchaseOrder.findFirst({
      where: {
        OR: [{ id: poId }, { poNumber: poId }]
      },
      include: {
        supplier: true,
        items: true
      }
    });

    const poNumber = poRecord?.poNumber || (poId.startsWith('PO-') ? poId : `PO-${poId}`);
    const productName = poRecord?.items?.[0]?.itemName || 'Industrial Goods';
    const quantity = poRecord?.items?.[0]?.quantity || 50;
    const totalAmount = poRecord?.totalAmount || 370000;
    const supplierName = poRecord?.supplier?.name || 'Verified Supplier';

    // 3. Attempt Shiprocket Order Creation
    const bookingResult = await createShiprocketOrder({
      poId: poRecord?.id || poId,
      poNumber,
      supplierName,
      productName,
      quantity,
      totalAmount,
      pickupAddress: {
        name: pickupAddress.name || supplierName,
        phone: pickupAddress.phone || '+919876543210',
        address: pickupAddress.address,
        city: pickupAddress.city || 'Chennai',
        state: pickupAddress.state || 'Tamil Nadu',
        pincode: pickupAddress.pincode,
        isConfirmed: true
      },
      deliveryAddress: {
        name: deliveryAddress.name || 'Procurement Desk',
        phone: deliveryAddress.phone || '+919876543210',
        address: deliveryAddress.address,
        city: deliveryAddress.city || 'Chennai',
        state: deliveryAddress.state || 'Tamil Nadu',
        pincode: deliveryAddress.pincode,
        isConfirmed: true
      },
      packageDetails: {
        weightKg: Number(packageDetails.weightKg),
        lengthCm: Number(packageDetails.lengthCm) || 50,
        widthCm: Number(packageDetails.widthCm) || 50,
        heightCm: Number(packageDetails.heightCm) || 50,
        packageCount: Number(packageDetails.packageCount) || 1,
        isConfirmed: true
      }
    });

    if (!bookingResult.success) {
      return NextResponse.json({
        success: false,
        error: 'SHIPROCKET_BOOKING_UNAVAILABLE',
        message: bookingResult.message || 'Shipment booking is not configured with live Shiprocket credentials. Add a verified AWB when the supplier dispatches.'
      }, { status: 400 });
    }

    // 4. Update Database Shipment Record
    const now = new Date();
    let shipmentRecord = poRecord ? await db.shipment.findFirst({
      where: { purchaseOrderId: poRecord.id }
    }) : null;

    if (shipmentRecord) {
      shipmentRecord = await db.shipment.update({
        where: { id: shipmentRecord.id },
        data: {
          status: 'SHIPMENT_BOOKED',
          shippingMode: 'procura_managed',
          pickupAddressConfirmed: true,
          pickupAddress: `${pickupAddress.address}, ${pickupAddress.city} ${pickupAddress.pincode}`,
          pickupPincode: pickupAddress.pincode,
          deliveryAddressConfirmed: true,
          deliveryAddress: `${deliveryAddress.address}, ${deliveryAddress.city} ${deliveryAddress.pincode}`,
          deliveryPincode: deliveryAddress.pincode,
          packageDetailsConfirmed: true,
          packageWeightKg: Number(packageDetails.weightKg),
          packageDimensions: `${packageDetails.lengthCm || 50}x${packageDetails.widthCm || 50}x${packageDetails.heightCm || 50} cm`,
          packageCount: Number(packageDetails.packageCount) || 1,
          shiprocketOrderId: bookingResult.orderId,
          shiprocketShipmentId: bookingResult.shipmentId,
          awbCode: bookingResult.awbCode,
          courierName: bookingResult.courierName,
          trackingNumber: bookingResult.awbCode,
          carrierName: bookingResult.courierName,
          currentStatus: 'Shipment booked with Shiprocket'
        }
      });
    }

    return NextResponse.json({
      success: true,
      booking: bookingResult
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'BOOKING_FAILED', message: err.message },
      { status: 500 }
    );
  }
}

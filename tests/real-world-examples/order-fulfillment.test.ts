import { describe, test, expect, beforeEach } from 'bun:test'
import { z } from 'zod'
import { async as resultAsync, err, func, ok } from 'xult'

type Charge = { chargeId: string; amount: number }
type Shipment = { labelId: string; carrier: string }

const OrderSchema = z.object({
	orderId: z.string(),
	sku: z.string(),
	quantity: z.number().int().positive(),
	paymentToken: z.string()
})

type OrderInput = z.infer<typeof OrderSchema>

const Inventory = {
	stock: new Map<string, number>(),
	reset() {
		this.stock.clear()
	},
	restock(sku: string, quantity: number) {
		this.stock.set(sku, (this.stock.get(sku) ?? 0) + quantity)
	},
	reserve(sku: string, quantity: number) {
		const available = this.stock.get(sku) ?? 0
		if (available < quantity) {
			return err('OUT_OF_STOCK', 'Not enough inventory to fulfill order.', { sku, available })
		}
		this.stock.set(sku, available - quantity)
		return ok({ remaining: this.stock.get(sku)! })
	},
	release(sku: string, quantity: number) {
		this.stock.set(sku, (this.stock.get(sku) ?? 0) + quantity)
	}
}

const PaymentGateway = {
	records: {
		charges: [] as Charge[],
		refunds: [] as string[]
	},
	reset() {
		this.records.charges = []
		this.records.refunds = []
	},
	async charge(token: string, amount: number) {
		const result = await resultAsync(
			Promise.resolve().then<Charge>(() => {
				if (token.startsWith('decline')) {
					throw new Error('card declined')
				}
				return { chargeId: crypto.randomUUID(), amount }
			}),
			(thrown) => err('PAYMENT_ERROR', 'Charge declined by processor.', { token, cause: thrown.details ?? thrown })
		)
		if (result.isOk()) {
			this.records.charges.push(result.value)
		}
		return result
	},
	refund(chargeId: string) {
		this.records.refunds.push(chargeId)
	}
}

const ShippingService = {
	labels: [] as Array<{ orderId: string } & Shipment>,
	reset() {
		this.labels = []
	},
	async create(orderId: string, sku: string) {
		const result = await resultAsync(
			Promise.resolve().then<Shipment>(() => {
				if (sku.endsWith('-OVERSIZED')) {
					throw new Error('size limit exceeded')
				}
				return { labelId: crypto.randomUUID(), carrier: 'ParcelPost' }
			}),
			(thrown) => err('SHIPMENT_ERROR', 'Carrier could not generate a shipping label.', { sku, cause: thrown.details ?? thrown })
		)
		if (result.isOk()) {
			this.labels.push({ orderId, ...result.value })
		}
		return result
	}
}

const fulfillOrder = func(
	OrderSchema,
	async (order: OrderInput) => {
		const reservation = Inventory.reserve(order.sku, order.quantity)
		if (reservation.isErr()) {
			return reservation
		}

		const payment = await PaymentGateway.charge(order.paymentToken, order.quantity * 129)
		if (payment.isErr()) {
			Inventory.release(order.sku, order.quantity)
			return payment
		}
		const charge = payment.value!

		const shipment = await ShippingService.create(order.orderId, order.sku)
		if (shipment.isErr()) {
			Inventory.release(order.sku, order.quantity)
			PaymentGateway.refund(charge.chargeId)
			return shipment
		}
		const label = shipment.value!

		return ok({
			orderId: order.orderId,
			chargeId: charge.chargeId,
			labelId: label.labelId
		})
	}
)

describe('Real World: Order Fulfillment', () => {
	beforeEach(() => {
		Inventory.reset()
		PaymentGateway.reset()
		ShippingService.reset()
	})

	test('fulfills an order when inventory, payment, and shipping succeed', async () => {
		Inventory.restock('BOOK-1', 5)

		const result = await fulfillOrder({
			orderId: 'ORD-1001',
			sku: 'BOOK-1',
			quantity: 2,
			paymentToken: 'tok_live_123'
		})

		expect(result.isOk()).toBe(true)
		if (result.isOk()) {
			expect(result.value.chargeId).toBe(PaymentGateway.records.charges[0]?.chargeId)
			expect(result.value.labelId).toBe(ShippingService.labels[0]?.labelId)
		}
		expect(Inventory.stock.get('BOOK-1')).toBe(3)
		expect(PaymentGateway.records.charges).toHaveLength(1)
		expect(PaymentGateway.records.refunds).toHaveLength(0)
		expect(ShippingService.labels).toHaveLength(1)
	})

	test('rejects the order when inventory is exhausted', async () => {
		Inventory.restock('BOOK-1', 1)

		const result = await fulfillOrder({
			orderId: 'ORD-1002',
			sku: 'BOOK-1',
			quantity: 3,
			paymentToken: 'tok_live_123'
		})

		expect(result.isErr('OUT_OF_STOCK')).toBe(true)
		expect(Inventory.stock.get('BOOK-1')).toBe(1)
		expect(PaymentGateway.records.charges).toHaveLength(0)
		expect(ShippingService.labels).toHaveLength(0)
	})

	test('refunds the charge when the carrier declines the shipment', async () => {
		Inventory.restock('TV-OVERSIZED', 2)

		const result = await fulfillOrder({
			orderId: 'ORD-1003',
			sku: 'TV-OVERSIZED',
			quantity: 1,
			paymentToken: 'tok_live_123'
		})

		expect(result.isErr('SHIPMENT_ERROR')).toBe(true)
		expect(Inventory.stock.get('TV-OVERSIZED')).toBe(2)
		expect(PaymentGateway.records.charges).toHaveLength(1)
		expect(PaymentGateway.records.refunds).toHaveLength(1)
		expect(ShippingService.labels).toHaveLength(0)
	})
})

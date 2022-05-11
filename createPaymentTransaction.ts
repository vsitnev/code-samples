    private static async createPaymentTransaction(bookingId: number, description: PaymentType, amount: number) {
        const booking = await Booking.findOne({
            where: {
                id: bookingId
            },
            relations: ['user', 'property', 'dealTerms', 'payments', 'payments.type', 'property.images']
        });

        if (booking) {
            const user = booking.user as User;

            return await getConnection().transaction(async transactionManager => {
                const existingPayment = booking.payments?.find(payment => payment.type.id === description.id);
                const {ephemeralKey, paymentIntent} = await this.createPaymentIntent(user.stripeId, amount);
                if (existingPayment) {
                    existingPayment.amount = amount;
                    existingPayment.paymentIntentId = paymentIntent.id;
                    existingPayment.status = PaymentStatus.PAYMENT_INTENT_PENDING;
                    existingPayment.booking = booking;
                    await transactionManager.save(existingPayment);

                    booking.payments = [existingPayment];
                    return {
                        paymentIntent: paymentIntent.client_secret,
                        ephemeralKey: ephemeralKey.secret,
                        customer: user.stripeId,
                        booking: booking.toDto(),
                    }
                }
                const payment = new Payment();
                payment.booking = booking;
                payment.type = description;
                payment.amount = Number(amount);
                payment.paymentIntentId = paymentIntent.id;
                payment.status = PaymentStatus.PAYMENT_INTENT_PENDING;
                const createdPayment = await transactionManager.save(payment);


                const bookingPayment = new BookingPayment();
                bookingPayment.booking = booking;
                bookingPayment.payment = createdPayment;
                await transactionManager.save(bookingPayment);

                booking.payments = [payment];
                return {
                    paymentIntent: paymentIntent.client_secret,
                    ephemeralKey: ephemeralKey.secret,
                    customer: user.stripeId,
                    booking: booking.toDto(),
                    payment: createdPayment
                }
            });
        }

    }
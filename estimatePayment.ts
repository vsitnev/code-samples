    public static async estimatePayment(req: express.Request, res: express.Response) {
        const {downpayment, term, annualIncomes, otherIncomes} = req.body;

        const propertyId = req.params.id;
        const property = await Property.findOne(propertyId);
        if (!property) {
            return res.status(StatusCodes.NOT_FOUND).send({
                message: ReasonPhrases.NOT_FOUND
            });
        }

        const bookingCalculatingResults = BookingCalculator.calculate(property.price, downpayment, term, annualIncomes, otherIncomes);
        const preApproved = !bookingCalculatingResults.maxPayment.isLessThan(bookingCalculatingResults.leasePayment);

        return res.status(StatusCodes.OK).send({
            preApproved,
            leasePayment: Number(bookingCalculatingResults.leasePayment),
            downPayment: Number(bookingCalculatingResults.downpayment),
            apartmentReservation: bookingCalculatingResults.apartmentReservation
        });
    }


    public static calculate(propertyPrice: number, downpayment: number, term: number, annualIncomes: number, otherIncomes: number) {
        const downPayment = new BigNumber(propertyPrice).multipliedBy(new BigNumber(downpayment).dividedBy(this.percent));
        const totalIncomes = new BigNumber(annualIncomes).dividedBy(this.monthInYear).plus(new BigNumber(otherIncomes).dividedBy(this.monthInYear));
        const maxPayment = totalIncomes.multipliedBy(this.percentageOfIncome);
        const ratePerPeriod = new BigNumber(this.annualRate);
        const numberOfPayments = new BigNumber(term).multipliedBy(this.monthInYear);
        const presentValue = new BigNumber(propertyPrice).minus(downPayment);

        const index = new BigNumber(ratePerPeriod.plus(1)).pow(numberOfPayments);
        const pmt = ratePerPeriod.multipliedBy(index.multipliedBy(presentValue)).dividedBy(index.plus(-1));

        return {
            maxPayment: maxPayment,
            leasePayment: pmt.toFixed(2),
            downpayment: downPayment.toFixed(2),
            apartmentReservation: this._contribution
        }
    }
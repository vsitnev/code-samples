export class BookingRoutes extends CommonRoutesConfig {

    private static upload = multer({
        storage: multer.memoryStorage()
    });

    constructor(app: express.Application) {
        super(app, ROUTES.BOOKING_ROUTES);
    }

    configureRoutes(): express.Application {
        const router = express.Router();
        router.route('/booking')
            .get(authentication, async (req: express.Request, res: express.Response) => {
                await BookingService.getAll(req, res);
            })
            .post(authentication, async (req: express.Request, res: express.Response) => {
                const mutex = new Mutex();
                await mutex.runExclusive(() => BookingService.reserveProperty(req, res));
            });

        router.route('/booking/:id')
            .get(authentication, async (req: express.Request, res: express.Response) => {
                await BookingService.findById(req, res);
            })

        router.route('/booking/:id/documents')
            .post(authentication, BookingRoutes.upload.array('documents'), async (req: express.Request, res: express.Response) => {
                await BookingService.uploadDocuments(req, res);
            });

        router.route('/booking/:id/contract')
            .post(authentication, async (req: express.Request, res: express.Response) => {
                await BookingService.createUserContract(req, res);
            });

        router.route('/booking/:id/payments/tax')
            .post(authentication, async (req: express.Request, res: express.Response) => {
                await BookingService.makeTaxPayment(req, res);
            });

        router.route('/booking/:id/payments/service-fee')
            .post(authentication, async (req: express.Request, res: express.Response) => {
                await BookingService.makeServiceFeePayment(req, res);
            });

        router.route('/booking/:id/payments/downpayment')
            .post(authentication, async (req: express.Request, res: express.Response) => {
                await BookingService.makeDownpayment(req, res);
            });

        this.app.use('/api/v1', router);
        return this.app;
    }
}

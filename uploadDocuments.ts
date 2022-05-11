    public static async uploadDocuments(req: express.Request, res: express.Response) {
        const files = req.files ? req.files as any : [];
        if (!files) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                message: 'documents multipart key is required'
            });
        }

        const booking = await Booking.findOne({
            where: {
                id: req.params.id
            },
            relations: ['user', 'property', 'documentGroup']
        });
        if (!booking) {
            return res.status(StatusCodes.NOT_FOUND).send({
                message: ReasonPhrases.NOT_FOUND
            });
        }

        await getConnection().transaction(async transactionManager => {
            const docs = await DocumentGroup.findOne({where: {booking: {id: booking.id}}});
            if (docs) {
                await transactionManager.delete(DocumentGroup, docs.id);
            }
            const group = new DocumentGroup();
            group.booking = booking;
            group.status = DocumentStatus.UNVERIFIED;
            const documents: Document[] = [];
            for (const file of files) {
                const key = uuidv4();
                await s3Client.putObject(BUCKETS.DOCS, key, file.buffer);

                const document = new Document();
                document.path = key;
                document.name = file.originalname;
                document.url = `${config.host}/api/v1/documents/${key}`;
                document.isVerified = false;
                await transactionManager.save(document);
                documents.push(document);
            }

            group.documents = documents;
            const savedGroup = await transactionManager.save(group);
            booking.status = BookingStatus.DOCUMENTS_UPLOADED;
            booking.documentGroup = savedGroup;
            await transactionManager.save(booking);
            savedGroup.documents = documents;
            savedGroup.booking = booking;
            return res.status(StatusCodes.CREATED).send(savedGroup.toDto());
        });
    }
    public static async addApartment(req: express.Request, res: express.Response) {
        const dto = new PropertyCreateRequestDto(req.body);
        const property = await dto.toEntity();

        await getConnection().transaction(async transactionManager => {
            const files = req.files ? req.files as any : [];
            for (const file of files.images) {
                const key = uuidv4();
                await s3Client.putObject(BUCKETS.IMAGES, key, file.buffer);

                const image = new Image();
                image.key = key;
                image.url = `${config.host}/api/v1/apartments/images/${key}`;
                const savedImage = await image.save();
                property.images.push(savedImage);
            }

            if (files.preview && files.preview.length > 0) {
                const key = uuidv4();
                await s3Client.putObject(BUCKETS.IMAGES, key, files.preview[0].buffer);

                const image = new Image();
                image.key = key;
                image.isPreview = true;
                image.url = `${config.host}/api/v1/apartments/images/${key}`;
                const savedImage = await transactionManager.save(image);
                property.images.push(savedImage);
            }

            const country = property.country;
            const savedCountry = await country.upsert(transactionManager);

            const city = property.city;
            city.country = savedCountry;
            const savedCity = await city.upsert(transactionManager);

            property.country = savedCountry;
            property.city = savedCity;

            const savedProperty = await transactionManager.save(property);
            return res.status(StatusCodes.CREATED).send(savedProperty.toDto());
        })
    }
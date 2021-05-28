module.exports = mongoose => {
    return mongoose.model(
            "streamers",
            mongoose.Schema(
                {
                    userId: {type: String, index: true, unique: true},
                    name: String,
                    webhook: String
                },
                { timestamps: true}
            )
        )
 }
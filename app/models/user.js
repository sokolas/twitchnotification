module.exports = mongoose => {
    return mongoose.model(
            "user",
            mongoose.Schema(
                {
                    userId: {type: String, index: true, unique: true},
                    name: String,
                    email: String,
                    isAdmin: Boolean
                },
                { timestamps: true}
            )
        )
 }
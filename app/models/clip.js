module.exports = mongoose => {
    return mongoose.model(
            "clip",
            mongoose.Schema(
                {
                    userId: {type: String, index: true},
                    userName: String,
                    title: String,
                    url: {type: String, index: true, unique: true},
                    creator: String, 
                    creation: {type: Date, index: true},
                    thumbnail: String,
                    posted: {type: Boolean, index: true}
                },
                { timestamps: true}
            )
        )
 }
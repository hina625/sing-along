import mongoose from "mongoose";


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL)
    console.log(`connect successfully`)
  } catch (error) {
    console.error('error while connectiong db: ', error.message)
  }
}

export default connectDB
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisURL = process.env.REDIS_URL;
if (!redisURL){
    throw new Error("REDIS_URL not defined");
}
const redis = new Redis(redisURL);

export default redis;

redis.set('test-key', 'hello there!').then( () => {
    console.log("IT WORKS")
});

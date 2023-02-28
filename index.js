import { GetBucketVersioningCommand, S3 } from "@aws-sdk/client-s3";
import { ListObjectsCommand } from "@aws-sdk/client-s3";

function findDuplicates(results) {
    for (let x = 0; x < results.length; x++) {
        let a = results[x];
        for (let y = 0; y < results.length; y++) {
            if (x !== y) {
                let b = results[y];
                // Need to filter out sizes of 0 because they are prefixes
                // which throws false positive
                // Could also include name but that could throw false negatives
                // if files have different names
                if (a.Size === b.Size && a.ETag === b.ETag) {
                    console.log('duplicate', a);
                    console.log(b);
                }
            }
        }
    }
}

async function main() {
    const s3Client = new S3({
        region: '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    });

    const bucketParams = {
        Bucket: '',
        Prefix: ''
    }

    const versioning = await s3Client.send(new GetBucketVersioningCommand(bucketParams));
    if (versioning.Status) {
        let truncated = true;
        let pageMarker;
        let resultSet = [];

        while (truncated) {
            try {
                const data = await s3Client.send(new ListObjectsCommand(bucketParams));
                for (let x = 0; x < data.Contents.length; x++) {
                    resultSet.push(data.Contents[x]);
                }
                truncated = data.IsTruncated
                if (truncated) {
                    pageMarker = resultSet.slice(-1)[0].Key;
                    bucketParams.Marker = pageMarker;
                }
            } catch (err) {
                console.log('Error', err);
                truncated = false;
            }
        }
        findDuplicates(resultSet);
    } else {
        console.log("Versioning disabled. No duplicates will exist.");
    }
}

main();
import { QLDB } from 'aws-sdk';
import 'source-map-support/register';

const qldb = new QLDB();
const ledgerName = process.env.ledgerName;
const roleArn = process.env.roleArn;
const bucketName = process.env.bucketName;

export const handler = () => {

    var timeRef = new Date();
    timeRef.setDate(0);

    var startTime = new Date(timeRef.getFullYear(), timeRef.getMonth(), 1);
    startTime.setUTCHours(0,0,0);

    var endTime = new Date(timeRef.getFullYear(), timeRef.getMonth() + 1, 1);
    endTime.setUTCHours(0,0,0);

    console.log(`creating snapshot for '${ledgerName} with start time: ${startTime.toISOString()} and end time: ${endTime.toISOString()}`);

    var params = {
        Name: ledgerName,
        RoleArn: roleArn,
        S3ExportConfiguration: {
            Bucket: bucketName,
            EncryptionConfiguration: {
                ObjectEncryptionType: "SSE_S3",
            },
            Prefix: "JournalExports"
        },
        ExclusiveEndTime: endTime,
        InclusiveStartTime: startTime,
    };

    qldb.exportJournalToS3(params, function(err, data) {
        if(err){
            console.log(err, err.stack);
        }
        else{
            console.log(data);
        }
    });
  
}

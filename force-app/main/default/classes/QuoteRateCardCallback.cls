public class QuoteRateCardCallback implements Metadata.DeployCallback {
    public void handleResult(Metadata.DeployResult result, Metadata.DeployCallbackContext context) {
        if (result.status == Metadata.DeployStatus.Succeeded) {
            System.debug('✅ Custom Metadata updated successfully.');
        } else {
            System.debug('❌ Custom Metadata update failed: ' + result.errorMessage);
        }
    }
}
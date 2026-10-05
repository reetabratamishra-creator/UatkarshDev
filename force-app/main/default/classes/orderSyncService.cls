public with sharing class OrderSyncService {

    /*
    ============================================================
    Public Entry Method
    ============================================================
    */

    public static void syncOrders(Set<Id> opportunityIds) {

        System.debug('===== OrderSyncService Started =====');
        System.debug('OpportunityIds = ' + opportunityIds);

        if(opportunityIds == null || opportunityIds.isEmpty()){
            return;
        }

        /*
        ------------------------------------------------------------
        Query Opportunities
        ------------------------------------------------------------
        */

        Map<Id, Opportunity> opportunityMap = new Map<Id, Opportunity>([
            SELECT
                Id,
                AccountId
            FROM Opportunity
            WHERE Id IN :opportunityIds
        ]);

        if(opportunityMap.isEmpty()){
            return;
        }

        /*
        ------------------------------------------------------------
        Query Existing Orders
        (Only One Order Per Opportunity)
        ------------------------------------------------------------
        */

        Map<Id, Order> existingOrderMap = new Map<Id, Order>();

        for(Order ord : [

            SELECT
                Id,
                OpportunityId,
                AccountId,
                PO_Amount__c,
                PoNumber,
                PoDate

            FROM Order

            WHERE OpportunityId IN :opportunityIds

        ]){

            existingOrderMap.put(ord.OpportunityId, ord);

        }

        /*
        ------------------------------------------------------------
        Query All PO Line Items
        ------------------------------------------------------------
        */

        List<PO_Line_Items__c> poLines = [

            SELECT

                Id,

                Opportunity__c,

                Status__c,
                Approval_Status__c,

                PO_Number__c,
                PO_Date__c,

                Amount__c,

                CreatedDate

            FROM PO_Line_Items__c

            WHERE Opportunity__c IN :opportunityIds

            ORDER BY CreatedDate ASC

        ];

        /*
        ------------------------------------------------------------
        Group PO Line Items by Opportunity
        ------------------------------------------------------------
        */

        Map<Id,List<PO_Line_Items__c>> poByOpportunity =
            new Map<Id,List<PO_Line_Items__c>>();

        for(PO_Line_Items__c po : poLines){

            if(!poByOpportunity.containsKey(po.Opportunity__c)){

                poByOpportunity.put(
                    po.Opportunity__c,
                    new List<PO_Line_Items__c>()
                );

            }

            poByOpportunity.get(po.Opportunity__c).add(po);

        }

        /*
        ------------------------------------------------------------
        DML Lists
        ------------------------------------------------------------
        */

        List<Order> ordersToInsert = new List<Order>();

        List<Order> ordersToUpdate = new List<Order>();

        /*
        ------------------------------------------------------------
        Process Each Opportunity
        ------------------------------------------------------------
        */

        for(Id oppId : opportunityMap.keySet()){

            Opportunity opp = opportunityMap.get(oppId);

            List<PO_Line_Items__c> currentPOLines =
                poByOpportunity.get(oppId);

            if(currentPOLines == null){

                continue;

            }

                     /*
            ------------------------------------------------------------
            Calculate Order Values
            ------------------------------------------------------------
            */

            Decimal totalAmount = 0;

            String orderPoNumber;
            Date orderPoDate;

            Boolean foundEligiblePO = false;
            Integer totalPOLines = currentPOLines.size();
            Integer eligiblePOLines = 0;

            for(PO_Line_Items__c po : currentPOLines){

                /*
                Eligible PO

                1. AI Completed
                OR
                2. Approved after Manual Review
                */

                Boolean eligible =
                    po.Status__c == 'Completed'
                    ||
                    po.Approval_Status__c == 'Approved';

                if(!eligible){
                    continue;
                }

                foundEligiblePO = true;
                eligiblePOLines++;

                System.debug(
    'PO=' + po.Id +
    ' Status=' + po.Status__c +
    ' Approval=' + po.Approval_Status__c +
    ' Eligible=' + eligible
);

                /*
                --------------------------------------------------------
                Sum Amount
                --------------------------------------------------------
                */

                if(po.Amount__c != null){
                    totalAmount += po.Amount__c;
                }

                /*
                --------------------------------------------------------
                First Eligible PO
                Used only while Order fields are blank
                --------------------------------------------------------
                */

                if(orderPoNumber == null
                && !String.isBlank(po.PO_Number__c)
                && !isMissing(po.PO_Number__c)){

                    orderPoNumber = po.PO_Number__c;

                }

            if(orderPoDate == null
            && !String.isBlank(po.PO_Date__c)
            && !isMissing(po.PO_Date__c)){

                System.debug('Raw PO Date = ' + po.PO_Date__c);

             Date parsedDate = parseDate(po.PO_Date__c);

            if(parsedDate != null){
            orderPoDate = parsedDate;
            }

          }

            }

            Boolean allPOsReady =
    totalPOLines > 0 &&
    eligiblePOLines == totalPOLines;

if (!allPOsReady) {
    System.debug(
        'Order not created/updated for Opportunity ' + oppId +
        '. Total PO Lines=' + totalPOLines +
        ', Eligible PO Lines=' + eligiblePOLines
    );
    continue;
}

            /*
            ------------------------------------------------------------
            Existing Order ?
            ------------------------------------------------------------
            */

            if (!existingOrderMap.containsKey(oppId)) {

    Order ord = new Order();

    ord.AccountId = opp.AccountId;
    ord.OpportunityId = opp.Id;
    ord.Status = 'Draft';
    ord.EffectiveDate = Date.today();

    ord.PO_Amount__c = totalAmount;

    if (orderPoNumber != null) {
        ord.PoNumber = orderPoNumber;
    }

    if (orderPoDate != null) {
        ord.PoDate = orderPoDate;
    }

    ordersToInsert.add(ord);

}

                      /*
            ------------------------------------------------------------
            Existing Order
            ------------------------------------------------------------
            */

            else{

                Order ord = existingOrderMap.get(oppId);

                Boolean isChanged = false;

                /*
                --------------------------------------------------------
                Always update Amount
                --------------------------------------------------------
                */

                Decimal existingAmount =
                    ord.PO_Amount__c == null
                    ? 0
                    : ord.PO_Amount__c;

                if(existingAmount != totalAmount){

                    ord.PO_Amount__c = totalAmount;

                    isChanged = true;

                }

                /*
                --------------------------------------------------------
                Populate PO Number ONLY ONCE

                If Order already has value,
                never overwrite it.
                --------------------------------------------------------
                */

                if(String.isBlank(ord.PoNumber)
                && !String.isBlank(orderPoNumber)){

                    ord.PoNumber = orderPoNumber;

                    isChanged = true;

                }

                /*
                --------------------------------------------------------
                Populate PO Date ONLY ONCE

                If already populated,
                never overwrite.
                --------------------------------------------------------
                */

                if(ord.PoDate == null
                && orderPoDate != null){

                    ord.PoDate = orderPoDate;

                    isChanged = true;

                }

                if(isChanged){

                    ordersToUpdate.add(ord);

                }

            }

        }

        /*
        ============================================================
        Perform DML
        ============================================================
        */

        if(!ordersToInsert.isEmpty()){

            Database.SaveResult[] insertResults =
                Database.insert(ordersToInsert,false);

            for(Integer i=0;i<insertResults.size();i++){

                if(!insertResults[i].isSuccess()){

                    for(Database.Error err :
                        insertResults[i].getErrors()){

                        System.debug(
                            'Order Insert Error : '
                            + err.getMessage()
                        );

                    }

                }

            }

        }

        if(!ordersToUpdate.isEmpty()){

            System.debug('Orders To Update = ' + ordersToUpdate);

            Database.SaveResult[] updateResults =
                Database.update(ordersToUpdate,false);

            for(Integer i=0;i<updateResults.size();i++){

                if(!updateResults[i].isSuccess()){

                    for(Database.Error err :
                        updateResults[i].getErrors()){

                        System.debug(
                            'Order Update Error : '
                            + err.getMessage()
                        );

                    }

                }

            }

        }

    }

    /*
    ============================================================
    Helper Method

    Returns TRUE if AI returned
    Not Found / Not Mentioned etc.
    ============================================================
    */

    private static Boolean isMissing(String value){

        if(String.isBlank(value)){
            return true;
        }

        String val = value.trim().toLowerCase();

        return val.contains('not found')
            || val.contains('not mentioned')
            || val.contains('not available')
            || val.contains('n/a');

    }

    //covert the date string in appropriate version 

    private static Date parseDate(String value){

    if(String.isBlank(value)){
        return null;
    }

    value = value.trim();

    // --------------------------------------------------------
    // yyyy-MM-dd
    // --------------------------------------------------------
    try{
        return Date.valueOf(value);
    }catch(Exception e){}

    // --------------------------------------------------------
    // dd-MM-yyyy
    // --------------------------------------------------------
    try{

        List<String> parts = value.split('-');

        if(parts.size() == 3){

            Integer day = Integer.valueOf(parts[0]);
            Integer month = Integer.valueOf(parts[1]);
            Integer year = Integer.valueOf(parts[2]);
 
           if (year < 100) {
           year += 2000;
         }

         System.debug(
    'Parsed Date => Day=' + day +
    ', Month=' + month +
    ', Year=' + year
);

            return Date.newInstance(year, month, day);
        }

    }catch(Exception e){}

    // --------------------------------------------------------
    // dd/MM/yyyy
    // --------------------------------------------------------
    try{

        List<String> parts = value.split('/');

        if(parts.size() == 3){

            Integer day = Integer.valueOf(parts[0]);
            Integer month = Integer.valueOf(parts[1]);
           Integer year = Integer.valueOf(parts[2]);

            if (year < 100) {
            year += 2000;
          }

          System.debug(
    'Parsed Date => Day=' + day +
    ', Month=' + month +
    ', Year=' + year
);

            return Date.newInstance(year, month, day);
        }

    }catch(Exception e){}

    // --------------------------------------------------------
    // dd MMM yyyy
    // Example:
    // 15 Jul 2026
    // --------------------------------------------------------
    try{

        List<String> parts = value.split(' ');

        if(parts.size() == 3){

            Integer day = Integer.valueOf(parts[0]);

            Integer year = Integer.valueOf(parts[2]);

            if (year < 100) {
            year += 2000;
          }

            Map<String,Integer> months = new Map<String,Integer>{
                'JAN'=>1,
                'JANUARY'=>1,
  
                 'FEB'=>2,
                 'FEBRUARY'=>2,
 
                 'MAR'=>3,
                 'MARCH'=>3,

                 'APR'=>4,
                 'APRIL'=>4,
 
                 'MAY'=>5,

                 'JUN'=>6,
                 'JUNE'=>6,

                 'JUL'=>7,
                 'JULY'=>7,

                'AUG'=>8,
                'AUGUST'=>8,

                'SEP'=>9,
                'SEPTEMBER'=>9,

                'OCT'=>10,
                'OCTOBER'=>10,

               'NOV'=>11,
               'NOVEMBER'=>11,

               'DEC'=>12,
               'DECEMBER'=>12
            };

            Integer month =
                months.get(parts[1].toUpperCase());

            if(month != null){

                System.debug(
    'Parsed Date => Day=' + day +
    ', Month=' + month +
    ', Year=' + year
);

                return Date.newInstance(
                    year,
                    month,
                    day
                );

            }

        }

    }catch(Exception e){}

    // --------------------------------------------------------
    // MMM dd, yyyy
    // Example:
    // Jul 15, 2026
    // --------------------------------------------------------
    try{

        value = value.replace(',', '');

        List<String> parts = value.split(' ');

        if(parts.size() == 3){

            Integer day = Integer.valueOf(parts[1]);

           Integer year = Integer.valueOf(parts[2]);

           if (year < 100) {
           year += 2000;
           }

            Map<String,Integer> months = new Map<String,Integer>{
                'JAN'=>1,
                'JANUARY'=>1,
 
                'FEB'=>2,
                'FEBRUARY'=>2,

                'MAR'=>3,
                'MARCH'=>3,

                'APR'=>4,
                 'APRIL'=>4,

                'MAY'=>5,

                'JUN'=>6,
                'JUNE'=>6,

                'JUL'=>7,
                'JULY'=>7,

                'AUG'=>8,
                'AUGUST'=>8,

                'SEP'=>9,
                'SEPTEMBER'=>9,

                'OCT'=>10,
                'OCTOBER'=>10,

                'NOV'=>11,
                'NOVEMBER'=>11,

                'DEC'=>12,
                'DECEMBER'=>12
            };

            Integer month =
                months.get(parts[0].toUpperCase());

            if(month != null){

                System.debug(
    'Parsed Date => Day=' + day +
    ', Month=' + month +
    ', Year=' + year
);

                return Date.newInstance(
                    year,
                    month,
                    day
                );

            }

        }

    }catch(Exception e){}

    return null;

}

}
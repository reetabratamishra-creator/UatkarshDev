public class TargetManagementController {

    // ──── DTOs ────────────────────────────────────────────────
    public class UserDTO {
        @AuraEnabled public Id userId;
        @AuraEnabled public String name;
        @AuraEnabled public String employeeNumber;
        @AuraEnabled public String groupName;
    }

    public class GroupDTO {
        @AuraEnabled public Id groupId;
        @AuraEnabled public String name;
    }

    public class TargetDTO {
        @AuraEnabled public Id targetId;
        @AuraEnabled public String targetName;
        @AuraEnabled public String moduleName;
        @AuraEnabled public String assignedTo;
        @AuraEnabled public Integer assignedCount;
        @AuraEnabled public String createdByName;
        @AuraEnabled public Datetime createdDate;
        @AuraEnabled public String status;
    }

    public class TrackingDTO {
        @AuraEnabled public Id trackingId;
        @AuraEnabled public Id assignmentId;
        @AuraEnabled public Date weekStartDate;
        @AuraEnabled public Decimal targetValue;
        @AuraEnabled public Decimal achievedValue;
    }

    public class AssignmentDetailDTO {
        @AuraEnabled public Id assignmentId;
        @AuraEnabled public Id userId;
        @AuraEnabled public String userName;
        @AuraEnabled public String groupName;
        @AuraEnabled public List<TrackingDTO> trackingRecords;
    }

    // ──── Get Active Users ────────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static List<UserDTO> getActiveUsers() {
        List<UserDTO> results = new List<UserDTO>();
        for (User u : [
            SELECT Id, Name, EmployeeNumber
            FROM User
            WHERE IsActive = true
            ORDER BY Name ASC
            LIMIT 2000
        ]) {
            UserDTO dto = new UserDTO();
            dto.userId = u.Id;
            dto.name = u.Name;
            dto.employeeNumber = u.EmployeeNumber != null ? u.EmployeeNumber : '';
            results.add(dto);
        }
        return results;
    }

    // ──── Get Public Groups ───────────────────────────────────
    @AuraEnabled(cacheable=true)
    public static List<GroupDTO> getPublicGroups() {
        List<GroupDTO> results = new List<GroupDTO>();
        for (Group g : [
            SELECT Id, Name
            FROM Group
            WHERE Type = 'Regular'
            ORDER BY Name ASC
        ]) {
            GroupDTO dto = new GroupDTO();
            dto.groupId = g.Id;
            dto.name = g.Name;
            results.add(dto);
        }
        return results;
    }

    // ──── Get Group Members (User members of a public group) ──
    @AuraEnabled
    public static List<UserDTO> getGroupMembers(Id groupId) {
        List<UserDTO> results = new List<UserDTO>();
        Set<Id> userIds = new Set<Id>();

        // Get direct user members
        for (GroupMember gm : [
            SELECT UserOrGroupId
            FROM GroupMember
            WHERE GroupId = :groupId
        ]) {
            String idStr = String.valueOf(gm.UserOrGroupId);
            // Check if it's a User (005) vs a nested Group
            if (idStr.startsWith('005')) {
                userIds.add(gm.UserOrGroupId);
            }
        }

        if (!userIds.isEmpty()) {
            // Get the group name for display
            Group grp = [SELECT Name FROM Group WHERE Id = :groupId LIMIT 1];

            for (User u : [
                SELECT Id, Name, EmployeeNumber
                FROM User
                WHERE Id IN :userIds
                AND IsActive = true
                ORDER BY Name ASC
            ]) {
                UserDTO dto = new UserDTO();
                dto.userId = u.Id;
                dto.name = u.Name;
                dto.employeeNumber = u.EmployeeNumber != null ? u.EmployeeNumber : '';
                dto.groupName = grp.Name;
                results.add(dto);
            }
        }
        return results;
    }

    // ──── Save Target (entire wizard data) ────────────────────
    @AuraEnabled
    public static Id saveTarget(String targetJSON) {
        Savepoint sp = Database.setSavepoint();
        try {
            Map<String, Object> data = (Map<String, Object>) JSON.deserializeUntyped(targetJSON);

            // 1. Create Target__c
            Target__c target = new Target__c();
            target.Name = (String) data.get('targetName');
            target.Target_Module__c = (String) data.get('targetModule');
            target.Frequency__c = (String) data.get('frequency');
            target.Metric__c = (String) data.get('metric');
            target.Assign_To_Type__c = (String) data.get('assignToType');
            target.Status__c = 'Active';
            insert target;

            // 2. Create Target_Assignment__c records
            List<Object> assignmentsData = (List<Object>) data.get('assignments');
            List<Target_Assignment__c> assignments = new List<Target_Assignment__c>();
            for (Object aObj : assignmentsData) {
                Map<String, Object> aMap = (Map<String, Object>) aObj;
                Target_Assignment__c ta = new Target_Assignment__c();
                ta.Target__c = target.Id;
                ta.User__c = (Id) aMap.get('userId');
                ta.Group_Name__c = aMap.containsKey('groupName') ? (String) aMap.get('groupName') : '';
                assignments.add(ta);
            }
            insert assignments;

            // 3. Create Target_Tracking__c records
            List<Object> trackingsData = (List<Object>) data.get('trackings');
            if (trackingsData != null && !trackingsData.isEmpty()) {
                // Build a map from userId to assignment Id
                Map<Id, Id> userToAssignment = new Map<Id, Id>();
                for (Integer i = 0; i < assignments.size(); i++) {
                    Map<String, Object> aMap = (Map<String, Object>) assignmentsData[i];
                    userToAssignment.put((Id) aMap.get('userId'), assignments[i].Id);
                }

                List<Target_Tracking__c> trackings = new List<Target_Tracking__c>();
                for (Object tObj : trackingsData) {
                    Map<String, Object> tMap = (Map<String, Object>) tObj;
                    Target_Tracking__c tt = new Target_Tracking__c();
                    Id userId = (Id) tMap.get('userId');
                    tt.Target_Assignment__c = userToAssignment.get(userId);
                    tt.Week_Start_Date__c = Date.valueOf((String) tMap.get('weekStartDate'));
                    tt.Target_Value__c = tMap.get('targetValue') != null ? Decimal.valueOf(String.valueOf(tMap.get('targetValue'))) : 0;
                    tt.Achieved_Value__c = 0;
                    trackings.add(tt);
                }
                insert trackings;
            }

            return target.Id;
        } catch (Exception e) {
            Database.rollback(sp);
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ──── Get All Targets (list view) ─────────────────────────
    @AuraEnabled
    public static List<TargetDTO> getTargets() {
        List<TargetDTO> results = new List<TargetDTO>();

        List<Target__c> targets = [
            SELECT Id, Name, Target_Module__c, Status__c,
                   CreatedBy.Name, CreatedDate,
                   (SELECT Id, User__r.Name FROM Target_Assignments__r ORDER BY CreatedDate ASC)
            FROM Target__c
            ORDER BY CreatedDate DESC
        ];

        for (Target__c t : targets) {
            TargetDTO dto = new TargetDTO();
            dto.targetId = t.Id;
            dto.targetName = t.Name;
            dto.moduleName = t.Target_Module__c;
            dto.createdByName = t.CreatedBy.Name;
            dto.createdDate = t.CreatedDate;
            dto.status = t.Status__c;

            // Build assigned to display
            List<String> names = new List<String>();
            Integer count = 0;
            for (Target_Assignment__c ta : t.Target_Assignments__r) {
                count++;
                if (names.size() < 2) {
                    names.add(ta.User__r.Name);
                }
            }
            dto.assignedTo = String.join(names, ', ');
            dto.assignedCount = count > 2 ? count - 2 : 0;
            results.add(dto);
        }
        return results;
    }

    // ──── Delete Target ───────────────────────────────────────
    @AuraEnabled
    public static void deleteTarget(Id targetId) {
        try {
            // Cascade delete will handle children due to Master-Detail
            delete [SELECT Id FROM Target__c WHERE Id = :targetId];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ──── Toggle Target Status ────────────────────────────────
    @AuraEnabled
    public static void toggleTargetStatus(Id targetId) {
        try {
            Target__c t = [SELECT Id, Status__c FROM Target__c WHERE Id = :targetId LIMIT 1];
            t.Status__c = t.Status__c == 'Active' ? 'Inactive' : 'Active';
            update t;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ──── Get Week Dates for Target Grid ──────────────────────
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getWeekDates() {
        List<Map<String, String>> weeks = new List<Map<String, String>>();
        Date today = Date.today();

        // Find the Monday of the current week
        Integer dayOfWeek = Math.mod(Date.newInstance(1900, 1, 7).daysBetween(today), 7);
        // dayOfWeek: 0=Sun, 1=Mon, ... 6=Sat
        Date currentMonday;
        if (dayOfWeek == 0) {
            currentMonday = today.addDays(-6);
        } else {
            currentMonday = today.addDays(-(dayOfWeek - 1));
        }

        // 5 previous weeks + current week + 4 next weeks = 10 weeks total
        Date startMonday = currentMonday.addDays(-35); // 5 weeks before

        for (Integer i = 0; i < 10; i++) {
            Date weekStart = startMonday.addDays(i * 7);
            Map<String, String> weekInfo = new Map<String, String>();
            weekInfo.put('weekStartDate', String.valueOf(weekStart));

            if (weekStart == currentMonday) {
                weekInfo.put('label', 'Current Week');
                weekInfo.put('type', 'current');
            } else if (weekStart < currentMonday) {
                Integer weeksAgo = Integer.valueOf(currentMonday.daysBetween(weekStart) / -7);
                if (weeksAgo == 1) {
                    weekInfo.put('label', 'Prev Week');
                } else {
                    weekInfo.put('label', 'Prev To Prev Week');
                }
                weekInfo.put('type', 'past');
            } else {
                Integer weeksAhead = Integer.valueOf(currentMonday.daysBetween(weekStart) / 7);
                if (weeksAhead == 1) {
                    weekInfo.put('label', 'Next Week');
                } else {
                    weekInfo.put('label', 'Next To Next Week');
                }
                weekInfo.put('type', 'future');
            }
            weeks.add(weekInfo);
        }

        return weeks;
    }
}

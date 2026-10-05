public with sharing class ShowInputSchoolform {

     @InvocableMethod(label='School Form' description='School Form Input')
    public static List<electResponse> schoolre(List<SchoolReq> screq) {
List<electResponse> results = new List<electResponse>();
     
        return results;

    }


    public class SchoolReq {
        @InvocableVariable(required=true)
        public Schooldata schdata;
    } 

    public class Schooldata {
        @InvocableVariable(required=true)
        public String schoolName;
        @InvocableVariable(required=true)
        public String schoolAddress;
        @InvocableVariable(required=true)
        public Integer numberOfStudents; 
    }

    public class electResponse {
        @InvocableVariable
        public String message;
    }
}
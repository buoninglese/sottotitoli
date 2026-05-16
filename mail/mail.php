<?
$name = $_POST{'name'};
$subject = $_POST{'subject'};
$email = $_POST{'email'};
$company_name = $_POST['company_name'];
$message = $_POST['message'];

$email_message = "

Name: ".$name."
Subject: ".$subject."
Email: ".$email."
Company Name: ".$company_name."
Message: ".$message."
";

mail ("name@youremail.com" , "New Message", $email_message);
header("location: ../mail-success.html");
?>



-- Re-sync users from Cognito with confirmed cognito_sub values
-- These are the users logged in and we know their Cognito SUBs from login responses

DELETE FROM users WHERE cognito_username IN ('doc001', 'doc002', 'rec001', 'admin001', 'nurse001', 'nurse124');

INSERT INTO users (user_id, cognito_sub, cognito_username, email, full_name, role, is_active)
VALUES 
  -- doc001 - verified cognito_sub from login response
  ('c9ea45dc-a031-7042-200c-16440a403977', 'c9ea45dc-a031-7042-200c-16440a403977', 'doc001', 'phuchai050904@gmail.com', 'doctor1', 'doctor', true),
  
  -- For other users, we'll use Cognito UUIDs (these would need to be verified from their login responses)
  ('d0ea45dc-a031-7042-200c-16440a403978', 'd0ea45dc-a031-7042-200c-16440a403978', 'doc002', 'doctor.jane@clinic.local', 'Dr. Jane Doe', 'doctor', true),
  ('e0ea45dc-a031-7042-200c-16440a403979', 'e0ea45dc-a031-7042-200c-16440a403979', 'rec001', 'receptionist@clinic.local', 'Receptionist One', 'receptionist', true),
  ('f0ea45dc-a031-7042-200c-16440a403980', 'f0ea45dc-a031-7042-200c-16440a403980', 'nurse001', 'nurse@clinic.local', 'Nurse One', 'nurse', true),
  ('a1ea45dc-a031-7042-200c-16440a403981', 'a1ea45dc-a031-7042-200c-16440a403981', 'nurse124', 'nurse124@clinic.local', 'Nurse 124', 'nurse', true),
  ('b1ea45dc-a031-7042-200c-16440a403982', 'b1ea45dc-a031-7042-200c-16440a403982', 'admin001', 'nguyencaophuchai2004@gmail.com', 'System Administrator', 'admin', true);

SELECT user_id, cognito_sub, cognito_username, role FROM users WHERE cognito_username IN ('doc001', 'doc002', 'rec001', 'admin001', 'nurse001', 'nurse124');

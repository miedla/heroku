var express = require('express');
var app = express();
var Redis = require('ioredis');
var redis = new Redis();
var bodyParser = require('body-parser');
var __dirname = 'public';

app.use('/static', express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res){
  //res.send('Hellow world!');
  res.sendfile(__dirname + '/hello.html');
});

app.get('/getSubjects', function(req, res){
  var html = 'Subjects list: <br>';
  redis.exists('subjects', function(err, inf){
    if(err){
      res.send('An error occured while checked subject key');
    }else{
      if(inf){
        console.log('subjects key exists');
        var html = 'List of all subjects:<br>';
        var addSubjectLink = '<a href="addSubject"> Create new subject </a>';
        html += addSubjectLink + '<br><br>';
        redis.lrange('subjects', 0, -1, function(err, inf){
          if(err){
            console.log('An error while fetch subjects');
          }else{
            for(i in inf){
              console.log('splitSubjs: '+inf[i]);
              console.log('i: '+i);
              sub = inf[i] + '&emsp;' +
              '<a href="deleteSubject?id=' + i + '"' +'>delete</a>' +
              '<br>';

              html += sub;
            }
            var homepageLink = '<a href="/">Homepage</a>';
            html += '<br><br>'+homepageLink;
            res.send(html);
          }
        });
      }else{
        console.log('subjects key does not exists');
        res.redirect('addSubject');
        //redirect to addSubject
      }
    }
  });
});

app.get('/deleteSubject', function(req, res){
  var subId = req.query.id;
  console.log('subId: '+subId);
  var subject = redis.lindex('subjects', subId, function(err, inf){
      if(err){
        res.send('An error occured while feth subject: '+err);
      }else{
        console.log('no errors');
        var html = 'Are you sure you want to delete this subject?<br>';
        html += inf + '<br>';

        var buttDelete = '<form method="GET" action="removeSubject">'+
        '<input type=hidden name="id" value='+ inf + '>' +
        '<input type="submit" value="Delete Subject"></form>';
        var buttBack = '<form method="GET" action="getStudents"><input type="submit" value="Back"></form>';

        res.send(html + buttDelete + buttBack);
      }
  })
});

app.get('/removeSubject', function(req, res){
  var sub = req.query.id;
  console.log('sub: '+sub);
  redis.lrem('subjects', 1, sub, function(err, inf){
    if(err){
      res.send('An error occure while lrem subject: '+err);
    }else{
      redis.keys('*grades', function(err, inf){
        if(err){

        }else{
          console.log('keys with grades: '+inf);
          for(i in inf){
            console.log('inf[i]: '+inf[i]);
            redis.zrem(inf[i], sub, function(err, inf2){
              if(err){
                res.send('Error while adding subject to student grades list: '+err);
              }else{
                console.log('inf2: '+inf2);
              }
            });
          }
        }
      });
      var subjsLink = '<a href="getSubjects">Subjects</a>';
      res.send('Subject deleted successfully<br><br>'+subjsLink);
    }
  })
})

app.get('/addSubject', function(req, res){
  res.sendfile(__dirname + '/subjectForm.html');
});

app.post('/postSubject', function(req, res){
  var subject = req.body.name;
  console.log('subject: ', subject);

  redis.lpush('subjects', subject, function(err, inf){
    if(err){
      res.send('An error occured while added new subject: '+err);
    }else{
      redis.keys('*grades', function(err, inf){
        if(err){

        }else{
          console.log('keys with grades: '+inf);
          for(i in inf){
            console.log('inf[i]: '+inf[i]);
            redis.zadd(inf[i], 0, subject, function(err, inf2){
              if(err){
                res.send('Error while adding subject to student grades list: '+err);
              }else{
                console.log('inf2: '+inf2);
              }
            });
          }
        }
      });
      var subjsLink = '<a href="getSubjects">Subjects</a>';
      res.send('Subject was added successfully!<br><br>'+subjsLink);
    }
  });
});

app.get('/getStudents', function(req, res){
  getStudents(function(html){
    //console.log('dupa');
    res.send(html);
  })
});

function getStudents(callback)
{
  var addStudentLink = '<a href="addStudent"> Add new student </a>';
  var html = 'Students list: <br>' +
    addStudentLink + '<br><br>' +
   '<br>index-firstname-lastname-birth_date-major-study_year' + '<br><br>';
  console.log('getStudents');
  redis.smembers('students', function(err, tab){
    if(err){
      console.log('errors: '+err);
    }else{
      var students = tab;//JSON.stringify(tab);
      counter = 0;
      if(students.length > 0){
        for(i in students){
          var student = redis.hmget(students[i],
            'index_number',
            'firstname',
            'lastname',
            'birth_date',
            'major',
            'study_year',
            function(err, stud){
            console.log('student index: ' + students[counter]);
            html += (stud + '&emsp;' +
            '<a href="getStudentGrades?id=' + students[counter] + '"' + '>grades</a>' +
            '&emsp;' +
            '<a href="editStudent?id=' + students[counter] + '"' + '>edit</a>' +
            '&emsp;' +
            '<a href="deleteStudent?id=' + students[counter] + '"' +'>delete</a>' +
            '<br>');

            counter++;
            if(counter == students.length){
              var homepageLink = '<a href="/">Homepage</a>';
              html += '<br><br>'+homepageLink;
              callback(html)
            }
          });
        }
      }else{
        var homepageLink = '<a href="/">Homepage</a>';
        html += '<br><br>'+homepageLink;
        callback(html);
      }
    }
  });
};

app.get('/getStudentGrades', function(req, res){
  var studId = req.query.id;
  console.log('studId: ' + studId);
  var html = '';
  redis.hmget(studId,
    'index_number',
    'firstname',
    'lastname',
    'birth_date',
    'major',
    'study_year',
    function(err, stud){
      if(err){

      }else{
        html = '<h1> Grades: </h1><br><h3>' + stud + '</h3><br>';
        editGradesLink = '<a href="editGrades?id=' + studId+'_grades' + '"' + '>edit grades</a>';
        html += editGradesLink + '<br><br>';
        console.log('grades tab: '+studId+'_grades');
        redis.zrange(studId+'_grades', 0, -1, 'WITHSCORES',function(err, inf){
          if(err){

          }else{
            for(i in inf){
              html += inf[i] + '<br>';
            }
            var studentsLink = '<a href="getStudents">Students list</a>';
            res.send(html+'<br><br>'+studentsLink);
          }
        });
      }
    });
});

app.get('/editGrades', function(req, res){
  var gradesId = req.query.id;
  console.log('grades id: '+req.query.id);
  var html = '';
  // var subjects = [];
  // var grades = [];
  var form = '<form method="POST" action="/postGrades">';

  redis.zrange(gradesId, 0, -1, 'WITHSCORES', function(err, inf){
    if(err){

    }else{
      for(i in inf){
        if(i%2==0){
          //subjects.push(inf[i]);
          form += inf[i] + '<br>';
        }else{
          console.log('subjects[i-1]: '+inf[i-1]);
          form += '<input type="text", name="' +
            inf[i-1] + '", value="'+
            inf[i]+'"><br>'
          ;
          //grades.push(inf[i]);
        }
      }
      form += '<input type="hidden" name="id" value="' + gradesId + '">';
      form += '<input type="submit" value="Save grades"></form>';
      res.send(form);
    }
  });
});

app.post('/postGrades', function(req, res){
  var grades = req.body;
  console.log(grades);
  for(var key in grades){
    if(grades.hasOwnProperty(key)){
      if(key != 'id'){
        redis.zadd(grades.id, grades[key], key, function(err, inf){
          if(err){
            res.send('Something wrong while grades changing: '+err);
          }
        });
      }
    }
  }
  var studentId = grades.id.split('_')[0];
  console.log('studentId: '+studentId);
  var gradesLink = '<a href="getStudentGrades?id=' + studentId + '"' + '>grades</a>';
  res.send('Grades saved successfully!<br><br>'+gradesLink);
});

app.get('/deleteStudent', function(req, res){
  var studId = req.query.id;
  console.log('studID:' + studId);
  var student = redis.hmget(studId,
    'index_number',
    'firstname',
    'lastname',
    'birth_date',
    'major',
    'study_year',
    function(err, stud){
      //console.log('student: '+stud);
      var html = 'Are you sure you want to delete this student?<br><br>' + stud + '<br><br>';
      var buttDelete = '<form method="GET" action="removeStudent">'+
      '<input type=hidden name="id" value='+ studId + '>' +
      '<input type="submit" value="Delete Student"></form>';
      var buttBack = '<form method="GET" action="getStudents"><input type="submit" value="Back"></form>';
      res.send(html+buttDelete+buttBack);
    });

});

app.get('/removeStudent', function(req, res){
  redis.srem('students', req.query.id, function(err, inf){
    if(err){
      res.send('some errors while remove from set: ' + err);
    }else{
      redis.del(req.query.id, function(err, inf){
        if(err){
          res.send('Some error occured while delete this student: '+err);
        }else{
          redis.del(req.query.id+'_grades', function(err, inf){
            if(err){
              res.send('Some error occured while delete this student grades: '+err);
            }else{
              var studsLink = '<a href="getStudents">Students</a>';
              res.send('Student was removed successfully<br><br>'+studsLink);
            }
          });
        }
      });
    }
  })

});

app.get('/addStudent', function(req, res){
  res.sendfile(__dirname + '/studentForm.html');
});

app.get('/editStudent', function(req, res){
  //res.sendfile(__dirname + '/studentForm.html');
  var studId = req.query.id;
  var form = '<form method="POST" action="/postStudent">';

  redis.hgetall(studId, function(err, inf){
    if(err){
      res.send('An error occured while fething student data: '+err);
    }else{
      console.log('student data: '+inf.index_number);
      form += 'Firstname:<br>' + '<input type="text", name="firstname", value="' + inf.firstname + '"><br>';
      form += 'Lastname:<br>' + '<input type="text", name="lastname", value="' + inf.lastname + '"><br>';
      form += 'Birth date:<br>' + '<input type="text", name="birth", value="' + inf.birth_date + '"><br>';
      form += 'Major:<br>' + '<input type="text", name="major", value="' + inf.major + '"><br>';
      form += 'Study year:<br>' + '<input type="text", name="year", value="' + inf.study_year + '"><br>';
      form += 'Index:<br>' + '<input type="text", name="index", value="' + inf.index_number + '"><br>';
      form += '<input type="hidden", name="old_index", value="' + inf.index_number + '"><br>';
      form += '<input type="submit" value="Save Student"></form>';

      res.send(form);
    }
  });
});

app.post('/postStudent', function(req, res){
  console.log('postStudent');
  var student = req.body;
  console.log('student: '+student.index);
  console.log('student old_index: '+student.old_index);
  var studOldIdx = student.old_index;

  var subjects = [];
  redis.exists('subjects', function(err, inf){
    if(err){

    }else{
      if(inf && studOldIdx == undefined){
        console.log('subjects key exists');
        redis.lrange('subjects', 0, -1, function(err, subjs){

          redis.exists(student.index+'_grades', function(err, inf){
            if(err){

            }else{
              if(inf){
                console.log('Key: '+student.index+'_grades'+' already exists');
              }else{
                for(i in subjs){
                  redis.zadd(student.index+'_grades', 0, subjs[i]);
                }
              }
            }
          });

        });

      }
    }
  });
  console.log('student.index: '+student.index);
  console.log('student.firstname: '+student.firstname);
  console.log('student.lastname: '+student.lastname);
  console.log('student.birth: '+student.birth);
  console.log('student.major: '+student.major);
  console.log('student.year: '+student.year);
  redis.hmset(student.index,
  'firstname', student.firstname,
  'lastname', student.lastname,
  'birth_date', student.birth,
  'major', student.major,
  'study_year', student.year,
  'index_number', student.index,
  function(err, tab){
      redis.sadd('students', student.index, function(err, tab){
        if(err){
          res.send('Something went wrong, error: !' + err);
        }else{
          var studsLink = '<a href="getStudents">Students</a>';

          if(studOldIdx !== undefined && studOldIdx != student.index){
            redis.del(student.old_index, function(err, inf){
              if(err){
                console.log('err while trying del student key: '+err);
              }else{
                //res.send('Student was edited successfully!<br><br>'+studsLink);
                redis.srem('students', studOldIdx);
                console.log('rename del student key OK');
                //res.send('Student was edited successfully!<br><br>'+studsLink);
                redis.rename(student.old_index+'_grades', student.index+'_grades', function(err, inf2){
                  if(err){
                    console.log('err while trying rename student grade key: '+err);
                  }else{
                    if(inf2){
                      console.log('rename student grades key OK');
                      res.send('Student was edited successfully!<br><br>'+studsLink);
                    }else{
                      console.log('reneme grades not ok: '+inf2);
                    }
                  }
                });
              }
            });
          }else{
            res.send('Student was added successfully!<br><br>'+studsLink);
          }


        }
      });
  });
})

app.listen(3000, function(){
  console.log('Listening on port 3000')
});

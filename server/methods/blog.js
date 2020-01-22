Meteor.methods({

  getImg(p){
    _check(p,{
      id: Match.Optional(PositiveIntCheck),
      slug: Match.Optional(NonEmptyStringCheck)
    });

    let q, sql = "SELECT data FROM large_objects WHERE ", params = [];

    if(p.id) {
      // Get by ID
      sql += "id = ?"
      params.push(p.id)

    } else if(p.slug) 
    {
      // Get by slug
      sql += "slug = ?"
      params.push(p.slug);
    }

    q = queryLiveDb(sql, params);

    if(q && q.length>0)
      return q[0].data;
    else
      return false;
  },

  upvote(p){
    _check(p,{
      id : PositiveIntCheck
    });

    queryLiveDb("Update blog SET upvotes = upvotes + 1 WHERE id = ?",[p.id]);
  }

});


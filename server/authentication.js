isAdmin = function(userId)
{
    if(userId) 
    {
        let q = queryLiveDb(`SELECT id, uuid, is_admin FROM users WHERE id = ?`, [userId]);
        if(q && q.length > 0) {
            return q[0].is_admin === 1;
        }
    }
    
    return false;
}
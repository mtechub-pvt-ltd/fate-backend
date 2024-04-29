const getTopUsers = async (req, res) => {
    const { userId } = req.params; //provide user id in params

    const userAnswersResult = await fetchUserAnswers(userId); // first fetch the answers of the  given user

    if (userAnswersResult.rows.length === 0) {
        return res.json({ similarUsers: [], log: [] });  
    }

    const similarUsers = await calculateSimilarUsers(userId, userAnswersResult.rows); // this function calculates the answers similarity 

    const topSimilarUsers = await fetchTopSimilarUsers(similarUsers); // fetch top 6 users from the list for the day 

    res.json({ error: false, similarUsers: detailedSimilarUsers }); // give the response to the client with an array of users and their details
}

const fetchUserAnswers = async (userId) => { 
    return await pool.query(
        'SELECT id, question_id, answers FROM answers WHERE user_id = $1',
        [userId]
    );
}

const calculateSimilarUsers = async (userId, userAnswers) => {
    const similarUsers = []; 
    for (const { id: answerId, question_id, answers: userAnswer } of userAnswers) {
        const otherUsersAnswersResult = await pool.query(
            'SELECT a.id, a.user_id, a.answers, a.created_at FROM answers a JOIN users u ON a.user_id = u.id WHERE a.question_id = $1 AND a.user_id != $2 AND u.role = \'user\'',
            [question_id, userId]
        ); // fetch the users and answers ids

        const otherUsersAnswers = otherUsersAnswersResult.rows; // stored the fetched  data from the query into variable

        otherUsersAnswers.forEach(({ id: otherAnswerId, user_id, answers: otherUserAnswer, created_at }) => {
            const similarity = natural.JaroWinklerDistance(userAnswer, otherUserAnswer); //natural.JaroWinkleDistance algo is used for the calculating the similarity between answers

            similarUsers.push({
                otherUserId: user_id,
                questionId: question_id,
                answerId: otherAnswerId,
                userAnswer,
                otherUserAnswer,
                similarity,
                createdAt: created_at,
            }); // this is the array which will return the users,questions and answers details and also the similarity between the current user and other users answers
        });
    }

    return similarUsers.sort((a, b) => b.similarity - a.similarity);
}

// this  function is used to get the number of top users  
const fetchTopSimilarUsers = async (similarUsers) => {
    //  extract 6 users  from the list of similar users
    return await Promise.all(
        similarUsers.slice(0, 6).map(({ otherUserId }) =>
            pool.query(
                'SELECT id, name, email, gender, age, images, profile_image FROM Users WHERE id = $1',
                [otherUserId]
            )
        )
    );
} 
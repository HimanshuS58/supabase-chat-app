import { useEffect, useRef, useState } from 'react'

import { supabase } from '../supabaseClient';


function App() {

  const [session, setSession] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [usersOnline, setUsersOnline] = useState([]);

  const chatContainerRef = useRef(null);

  useEffect(() => {

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });


    return () => subscription.unsubscribe();

  }, []);

  console.log(session);


  // sign in
  const signIn = async () => {

    await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
  }

  // sign out
  const signOut = async () => {

    const { error } = await supabase.auth.signOut();
  }


  // supabase channels
  useEffect(() => {

    if (!session?.user) {

      setUsersOnline([]);
      return
    }

    // create channel
    const roomOne = supabase.channel('room_one', {
      config: {
        presence: {
          key: session?.user?.id,
        },
        broadcast: {
          self: true,
        },
      }
    })


    // listening messages
    roomOne.on('broadcast', { event: 'message' }, (payload) => {
      setMessages((prevMessage) => [...prevMessage, payload.payload]);
    })

    // listening user presence
    roomOne.on('presence', { event: 'sync' }, () => {
      const users = roomOne.presenceState();
      setUsersOnline(Object.keys(users));
    })

    // start listening (i.e. subscribe)
    roomOne.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await roomOne.track({
          id: session?.user?.id
        })
      }
    })

    return () => {

      roomOne.unsubscribe();
    }

  }, [session])


  // send message
  const sendMessage = async (e) => {

    e.preventDefault();

    supabase.channel('room_one').send({
      type: 'broadcast',
      event: 'message',
      payload: {
        message: newMessage,
        user_name: session?.user?.user_metadata?.email,
        avatar_url: session?.user?.user_metadata?.avatar_url,
        timestamp: new Date().toISOString(),
      }
    });

    setNewMessage('');
  }

  const formatTime = (isoString) => {

    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  useEffect(() => {

    setTimeout(() => {
        if(chatContainerRef.current){
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;                
        }
    }, [100])
  }, [messages])





  if (!session) {
    return (
      <div className='w-full flex h-screen justify-center items-center p-4'>
        <button onClick={signIn}>Sign in with Google to chat</button>
      </div>
    )
  }
  else {
    return (
      <div className='w-full flex h-screen justify-center items-center p-4'>
        <div className='border border-gray-700 max-w-6xl w-full min-h-150 rounded-lg'>

          {/* Header */}
          <div className='flex justify-between h-20 border-b border-gray-700'>
            <div className='p-4'>
              <p className='text-gray-300'>Signed in as {session?.user?.email} </p>
              <p className='text-gray-300 italic text-sm'>{usersOnline.length} users online</p>
            </div>
            <button onClick={signOut} className='m-4 text-white'>Sign out</button>
          </div>

          {/* main chat */}
          <div 
              ref = {chatContainerRef}
              className='p-4 flex flex-col overflow-y-auto h-125'>

            {messages.map((msg, idx) => (
              <div key={idx} className={`my-2 flex w-full items-start ${
                                         msg?.user_name === session?.user?.email
                                         ? 'justify-end' : 'justify start'}`}>

          {/* received message - avatar on left */}
                {msg?.user_name !== session?.user?.email && (
                  <img 
                      src={msg?.avatar_url}
                      alt="/"
                      className='w-10 h-10 rounded-full mr-2'
                      />
                )}  

                <div className='flex flex-col w-full'>

                  <div className={`p-1 max-w-[70%] rounded-xl ${
                                  msg?.user_name === session?.user?.email 
                                  ? 'bg-gray-700 text-white ml-auto' 
                                  : 'bg-gray-500 text-white mr-auto' 
                                  }`}>
                     <p>{msg.message}</p>
                  </div> 

                  {/* timestamp */}
                  <div className={`text-xs text-white opacity-75 pt-1 ${
                                  msg?.user_name === session?.user?.email
                                  ? 'text-right mr-2'
                                  : 'text-left ml-2'
                                  }`}>
                   {formatTime(msg?.timestamp)}   
                  </div>

                  </div>   

              {msg?.user_name === session?.user?.email && (
                <img
                     src={msg?.avatar_url} 
                     alt="/" 
                     className='w-10 h-10 rounded-full ml-2'            
                />
              )
              }   

              </div>
            ))}
          </div>

          {/* message input */}
          <form onSubmit={sendMessage} className='flex flex-col sm:flex-row p-4 border-t border-gray-700'>
            <input type="text"
              placeholder='Type a message...'
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className='p-2 w-full bg-[#00000040] rounded-lg text-gray-300'
            />
            <button className='mt-4 sm:mt-0 sm:ml-8 text-white max-h-12'>Send</button>
          </form>

        </div>
      </div>


    );
  }

}

export default App

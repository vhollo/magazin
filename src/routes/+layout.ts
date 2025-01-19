import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '$lib/firebase'
import { authUser } from '$lib/authStore'

onAuthStateChanged(firebaseAuth, (user) => {
  if (user) {
    // console.log($authUser)
    // User is signed in, update your state accordingly
    // $authUser = { 'uid': user.uid, 'email': user.email }
    authUser.set({ 'uid': user.uid, 'email': user.email })
    // console.log($authUser)
  } else {
    // User is signed out
    authUser.set(undefined)
  }
})


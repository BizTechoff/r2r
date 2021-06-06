import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogService } from '../../../common/dialog';
import { SendWapp } from '../send-wapp/sendWapp';
import { SendSms } from './sendSms';

@Component({
  selector: 'app-send-sms',
  templateUrl: './send-sms.component.html',
  styleUrls: ['./send-sms.component.scss']
})
export class SendSmsComponent implements OnInit {

  args: {
    mobile: string,
    message: string
  } = { mobile: '0526526063', message: 'r2r: Test Message' };

  okPressed = false;

  constructor(private dialogRef: MatDialogRef<any>, private dialog: DialogService) { }

  ngOnInit() {
  }

  //window.location.href = "tel:" + col.value;

//   openWaze() {
//     //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
//     location.href = 'waze://?ll=' + toLongLat(this.getDrivingLocation()) + "&q=" + encodeURI(this.address.value) + '&navigate=yes';
// }

  async send() {
    // await new SendWapp(this.args.mobile, this.args.message).send();
    let response = await new SendSms(this.args.mobile, this.args.message).send();
    if (response.success) {
      this.select();
    }
    else {
      this.dialog.error(response.error);
    }
  }

  close() {
    this.dialogRef.close();
  }
  select() {
    this.dialogRef.close();
    this.okPressed = true;
  }

}
